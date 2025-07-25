import getDirection from 'direction'
import debounce from 'lodash/debounce'
import throttle from 'lodash/throttle'
import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  forwardRef,
  ForwardedRef,
} from 'react'
import { JSX } from 'react'
import scrollIntoView from 'scroll-into-view-if-needed'
import {
  Editor,
  Element,
  Node,
  NodeEntry,
  Path,
  Range,
  Text,
  Transforms,
  DecoratedRange,
  LeafPosition,
} from 'slate'
import { useAndroidInputManager } from '../hooks/android-input-manager/use-android-input-manager'
import useChildren from '../hooks/use-children'
import { DecorateContext, useDecorateContext } from '../hooks/use-decorations'
import { useIsomorphicLayoutEffect } from '../hooks/use-isomorphic-layout-effect'
import { ReadOnlyContext } from '../hooks/use-read-only'
import { useSlate } from '../hooks/use-slate'
import { useTrackUserInput } from '../hooks/use-track-user-input'
import { ReactEditor } from '../plugin/react-editor'
import { TRIPLE_CLICK } from 'slate-dom'
import {
  DOMElement,
  DOMRange,
  DOMText,
  getActiveElement,
  getDefaultView,
  getSelection,
  isDOMElement,
  isDOMNode,
  isPlainTextOnlyPaste,
} from 'slate-dom'
import {
  CAN_USE_DOM,
  HAS_BEFORE_INPUT_SUPPORT,
  IS_ANDROID,
  IS_CHROME,
  IS_FIREFOX,
  IS_FIREFOX_LEGACY,
  IS_IOS,
  IS_WEBKIT,
  IS_UC_MOBILE,
  IS_WECHATBROWSER,
} from 'slate-dom'
import { Hotkeys } from 'slate-dom'
import {
  IS_NODE_MAP_DIRTY,
  EDITOR_TO_ELEMENT,
  EDITOR_TO_FORCE_RENDER,
  EDITOR_TO_PENDING_INSERTION_MARKS,
  EDITOR_TO_USER_MARKS,
  EDITOR_TO_USER_SELECTION,
  EDITOR_TO_WINDOW,
  ELEMENT_TO_NODE,
  IS_COMPOSING,
  IS_FOCUSED,
  IS_READ_ONLY,
  MARK_PLACEHOLDER_SYMBOL,
  NODE_TO_ELEMENT,
  PLACEHOLDER_SYMBOL,
} from 'slate-dom'
import { RestoreDOM } from './restore-dom/restore-dom'
import { AndroidInputManager } from '../hooks/android-input-manager/android-input-manager'
import { ComposingContext } from '../hooks/use-composing'
import { useFlushDeferredSelectorsOnRender } from '../hooks/use-slate-selector'

type DeferredOperation = () => void

const Children = (props: Parameters<typeof useChildren>[0]) => (
  <React.Fragment>{useChildren(props)}</React.Fragment>
)

/**
 * `RenderElementProps` are passed to the `renderElement` handler.
 */

export interface RenderElementProps {
  children: any
  element: Element
  attributes: {
    'data-slate-node': 'element'
    'data-slate-inline'?: true
    'data-slate-void'?: true
    dir?: 'rtl'
    ref: any
  }
}

/**
 * `RenderChunkProps` are passed to the `renderChunk` handler
 */
export interface RenderChunkProps {
  highest: boolean
  lowest: boolean
  children: any
  attributes: {
    'data-slate-chunk': true
  }
}

/**
 * `RenderLeafProps` are passed to the `renderLeaf` handler.
 */

export interface RenderLeafProps {
  children: any
  /**
   * The leaf node with any applied decorations.
   * If no decorations are applied, it will be identical to the `text` property.
   */
  leaf: Text
  text: Text
  attributes: {
    'data-slate-leaf': true
  }
  /**
   * The position of the leaf within the Text node, only present when the text node is split by decorations.
   */
  leafPosition?: LeafPosition
}

/**
 * `RenderTextProps` are passed to the `renderText` handler.
 */
export interface RenderTextProps {
  text: Text
  children: any
  attributes: {
    'data-slate-node': 'text'
    ref: any
  }
}

/**
 * `EditableProps` are passed to the `<Editable>` component.
 */

export type EditableProps = {
  decorate?: (entry: NodeEntry) => DecoratedRange[]
  onDOMBeforeInput?: (event: InputEvent) => void
  placeholder?: string
  readOnly?: boolean
  role?: string
  style?: React.CSSProperties
  renderElement?: (props: RenderElementProps) => JSX.Element
  renderChunk?: (props: RenderChunkProps) => JSX.Element
  renderLeaf?: (props: RenderLeafProps) => JSX.Element
  renderText?: (props: RenderTextProps) => JSX.Element
  renderPlaceholder?: (props: RenderPlaceholderProps) => JSX.Element
  scrollSelectionIntoView?: (editor: ReactEditor, domRange: DOMRange) => void
  as?: React.ElementType
  disableDefaultStyles?: boolean
} & React.TextareaHTMLAttributes<HTMLDivElement>

/**
 * Editable.
 */

export const Editable = forwardRef(
  (props: EditableProps, forwardedRef: ForwardedRef<HTMLDivElement>) => {
    const defaultRenderPlaceholder = useCallback(
      (props: RenderPlaceholderProps) => <DefaultPlaceholder {...props} />,
      []
    )
    const {
      autoFocus,
      decorate = defaultDecorate,
      onDOMBeforeInput: propsOnDOMBeforeInput,
      placeholder,
      readOnly = false,
      renderElement,
      renderChunk,
      renderLeaf,
      renderText,
      renderPlaceholder = defaultRenderPlaceholder,
      scrollSelectionIntoView = defaultScrollSelectionIntoView,
      style: userStyle = {},
      as: Component = 'div',
      disableDefaultStyles = false,
      ...attributes
    } = props
    const editor = useSlate()
    // Rerender editor when composition status changed
    const [isComposing, setIsComposing] = useState(false)
    const ref = useRef<HTMLDivElement | null>(null)
    const deferredOperations = useRef<DeferredOperation[]>([])
    const [placeholderHeight, setPlaceholderHeight] = useState<
      number | undefined
    >()
    const processing = useRef(false)

    const { onUserInput, receivedUserInput } = useTrackUserInput()

    const [, forceRender] = useReducer(s => s + 1, 0)
    EDITOR_TO_FORCE_RENDER.set(editor, forceRender)

    // Update internal state on each render.
    IS_READ_ONLY.set(editor, readOnly)

    // Keep track of some state for the event handler logic.
    const state = useMemo(
      () => ({
        isDraggingInternally: false,
        isUpdatingSelection: false,
        latestElement: null as DOMElement | null,
        hasMarkPlaceholder: false,
      }),
      []
    )

    // The autoFocus TextareaHTMLAttribute doesn't do anything on a div, so it
    // needs to be manually focused.
    //
    // If this stops working in Firefox, make sure nothing is causing this
    // component to re-render during the initial mount. If the DOM selection is
    // set by `useIsomorphicLayoutEffect` before `onDOMSelectionChange` updates
    // `editor.selection`, the DOM selection can be removed accidentally.
    useEffect(() => {
      if (ref.current && autoFocus) {
        ref.current.focus()
      }
    }, [autoFocus])

    /**
     * The AndroidInputManager object has a cyclical dependency on onDOMSelectionChange
     *
     * It is defined as a reference to simplify hook dependencies and clarify that
     * it needs to be initialized.
     */
    const androidInputManagerRef = useRef<
      AndroidInputManager | null | undefined
    >()

    // Listen on the native `selectionchange` event to be able to update any time
    // the selection changes. This is required because React's `onSelect` is leaky
    // and non-standard so it doesn't fire until after a selection has been
    // released. This causes issues in situations where another change happens
    // while a selection is being dragged.
    const onDOMSelectionChange = useMemo(
      () =>
        throttle(() => {
          if (IS_NODE_MAP_DIRTY.get(editor)) {
            onDOMSelectionChange()
            return
          }

          const el = ReactEditor.toDOMNode(editor, editor)
          const root = el.getRootNode()

          if (!processing.current && IS_WEBKIT && root instanceof ShadowRoot) {
            processing.current = true

            const active = getActiveElement()

            if (active) {
              document.execCommand('indent')
            } else {
              Transforms.deselect(editor)
            }

            processing.current = false
            return
          }

          const androidInputManager = androidInputManagerRef.current
          if (
            (IS_ANDROID || !ReactEditor.isComposing(editor)) &&
            (!state.isUpdatingSelection || androidInputManager?.isFlushing()) &&
            !state.isDraggingInternally
          ) {
            const root = ReactEditor.findDocumentOrShadowRoot(editor)
            const { activeElement } = root
            const el = ReactEditor.toDOMNode(editor, editor)
            const domSelection = getSelection(root)

            if (activeElement === el) {
              state.latestElement = activeElement
              IS_FOCUSED.set(editor, true)
            } else {
              IS_FOCUSED.delete(editor)
            }

            if (!domSelection) {
              return Transforms.deselect(editor)
            }

            const { anchorNode, focusNode } = domSelection

            const anchorNodeSelectable =
              ReactEditor.hasEditableTarget(editor, anchorNode) ||
              ReactEditor.isTargetInsideNonReadonlyVoid(editor, anchorNode)

            const focusNodeInEditor = ReactEditor.hasTarget(editor, focusNode)

            if (anchorNodeSelectable && focusNodeInEditor) {
              const range = ReactEditor.toSlateRange(editor, domSelection, {
                exactMatch: false,
                suppressThrow: true,
              })

              if (range) {
                if (
                  !ReactEditor.isComposing(editor) &&
                  !androidInputManager?.hasPendingChanges() &&
                  !androidInputManager?.isFlushing()
                ) {
                  Transforms.select(editor, range)
                } else {
                  androidInputManager?.handleUserSelect(range)
                }
              }
            }

            // Deselect the editor if the dom selection is not selectable in readonly mode
            if (readOnly && (!anchorNodeSelectable || !focusNodeInEditor)) {
              Transforms.deselect(editor)
            }
          }
        }, 100),
      [editor, readOnly, state]
    )

    const scheduleOnDOMSelectionChange = useMemo(
      () => debounce(onDOMSelectionChange, 0),
      [onDOMSelectionChange]
    )

    androidInputManagerRef.current = useAndroidInputManager({
      node: ref,
      onDOMSelectionChange,
      scheduleOnDOMSelectionChange,
    })

    useIsomorphicLayoutEffect(() => {
      // Update element-related weak maps with the DOM element ref.
      let window
      if (ref.current && (window = getDefaultView(ref.current))) {
        EDITOR_TO_WINDOW.set(editor, window)
        EDITOR_TO_ELEMENT.set(editor, ref.current)
        NODE_TO_ELEMENT.set(editor, ref.current)
        ELEMENT_TO_NODE.set(ref.current, editor)
      } else {
        NODE_TO_ELEMENT.delete(editor)
      }

      // Make sure the DOM selection state is in sync.
      const { selection } = editor
      const root = ReactEditor.findDocumentOrShadowRoot(editor)
      const domSelection = getSelection(root)

      if (
        !domSelection ||
        !ReactEditor.isFocused(editor) ||
        androidInputManagerRef.current?.hasPendingAction()
      ) {
        return
      }

      const setDomSelection = (forceChange?: boolean) => {
        const hasDomSelection = domSelection.type !== 'None'

        // If the DOM selection is properly unset, we're done.
        if (!selection && !hasDomSelection) {
          return
        }

        // Get anchorNode and focusNode
        const focusNode = domSelection.focusNode
        let anchorNode

        // COMPAT: In firefox the normal selection way does not work
        // (https://github.com/ianstormtaylor/slate/pull/5486#issue-1820720223)
        if (IS_FIREFOX && domSelection.rangeCount > 1) {
          const firstRange = domSelection.getRangeAt(0)
          const lastRange = domSelection.getRangeAt(domSelection.rangeCount - 1)

          // Right to left
          if (firstRange.startContainer === focusNode) {
            anchorNode = lastRange.endContainer
          } else {
            // Left to right
            anchorNode = firstRange.startContainer
          }
        } else {
          anchorNode = domSelection.anchorNode
        }

        // verify that the dom selection is in the editor
        const editorElement = EDITOR_TO_ELEMENT.get(editor)!
        let hasDomSelectionInEditor = false
        if (
          editorElement.contains(anchorNode) &&
          editorElement.contains(focusNode)
        ) {
          hasDomSelectionInEditor = true
        }

        // If the DOM selection is in the editor and the editor selection is already correct, we're done.
        if (
          hasDomSelection &&
          hasDomSelectionInEditor &&
          selection &&
          !forceChange
        ) {
          const slateRange = ReactEditor.toSlateRange(editor, domSelection, {
            exactMatch: true,

            // domSelection is not necessarily a valid Slate range
            // (e.g. when clicking on contentEditable:false element)
            suppressThrow: true,
          })

          if (slateRange && Range.equals(slateRange, selection)) {
            if (!state.hasMarkPlaceholder) {
              return
            }

            // Ensure selection is inside the mark placeholder
            if (
              anchorNode?.parentElement?.hasAttribute(
                'data-slate-mark-placeholder'
              )
            ) {
              return
            }
          }
        }

        // when <Editable/> is being controlled through external value
        // then its children might just change - DOM responds to it on its own
        // but Slate's value is not being updated through any operation
        // and thus it doesn't transform selection on its own
        if (selection && !ReactEditor.hasRange(editor, selection)) {
          editor.selection = ReactEditor.toSlateRange(editor, domSelection, {
            exactMatch: false,
            suppressThrow: true,
          })
          return
        }

        // Otherwise the DOM selection is out of sync, so update it.
        state.isUpdatingSelection = true

        let newDomRange: DOMRange | null = null

        try {
          newDomRange = selection && ReactEditor.toDOMRange(editor, selection)
        } catch (e) {
          // Ignore, dom and state might be out of sync
        }

        if (newDomRange) {
          if (ReactEditor.isComposing(editor) && !IS_ANDROID) {
            domSelection.collapseToEnd()
          } else if (Range.isBackward(selection!)) {
            domSelection.setBaseAndExtent(
              newDomRange.endContainer,
              newDomRange.endOffset,
              newDomRange.startContainer,
              newDomRange.startOffset
            )
          } else {
            domSelection.setBaseAndExtent(
              newDomRange.startContainer,
              newDomRange.startOffset,
              newDomRange.endContainer,
              newDomRange.endOffset
            )
          }
          scrollSelectionIntoView(editor, newDomRange)
        } else {
          domSelection.removeAllRanges()
        }

        return newDomRange
      }

      // In firefox if there is more then 1 range and we call setDomSelection we remove the ability to select more cells in a table
      if (domSelection.rangeCount <= 1) {
        setDomSelection()
      }

      const ensureSelection =
        androidInputManagerRef.current?.isFlushing() === 'action'

      if (!IS_ANDROID || !ensureSelection) {
        setTimeout(() => {
          state.isUpdatingSelection = false
        })
        return
      }

      let timeoutId: ReturnType<typeof setTimeout> | null = null
      const animationFrameId = requestAnimationFrame(() => {
        if (ensureSelection) {
          const ensureDomSelection = (forceChange?: boolean) => {
            try {
              const el = ReactEditor.toDOMNode(editor, editor)
              el.focus()

              setDomSelection(forceChange)
            } catch (e) {
              // Ignore, dom and state might be out of sync
            }
          }

          // Compat: Android IMEs try to force their selection by manually re-applying it even after we set it.
          // This essentially would make setting the slate selection during an update meaningless, so we force it
          // again here. We can't only do it in the setTimeout after the animation frame since that would cause a
          // visible flicker.
          ensureDomSelection()

          timeoutId = setTimeout(() => {
            // COMPAT: While setting the selection in an animation frame visually correctly sets the selection,
            // it doesn't update GBoards spellchecker state. We have to manually trigger a selection change after
            // the animation frame to ensure it displays the correct state.
            ensureDomSelection(true)
            state.isUpdatingSelection = false
          })
        }
      })

      return () => {
        cancelAnimationFrame(animationFrameId)
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
      }
    })

    // Listen on the native `beforeinput` event to get real "Level 2" events. This
    // is required because React's `beforeinput` is fake and never really attaches
    // to the real event sadly. (2019/11/01)
    // https://github.com/facebook/react/issues/11211
    const onDOMBeforeInput = useCallback(
      (event: InputEvent) => {
        handleNativeHistoryEvents(editor, event)
        const el = ReactEditor.toDOMNode(editor, editor)
        const root = el.getRootNode()

        if (processing?.current && IS_WEBKIT && root instanceof ShadowRoot) {
          const ranges = event.getTargetRanges()
          const range = ranges[0]

          const newRange = new window.Range()

          newRange.setStart(range.startContainer, range.startOffset)
          newRange.setEnd(range.endContainer, range.endOffset)

          // Translate the DOM Range into a Slate Range
          const slateRange = ReactEditor.toSlateRange(editor, newRange, {
            exactMatch: false,
            suppressThrow: false,
          })

          Transforms.select(editor, slateRange)

          event.preventDefault()
          event.stopImmediatePropagation()
          return
        }
        onUserInput()

        if (
          !readOnly &&
          ReactEditor.hasEditableTarget(editor, event.target) &&
          !isDOMEventHandled(event, propsOnDOMBeforeInput)
        ) {
          // COMPAT: BeforeInput events aren't cancelable on android, so we have to handle them differently using the android input manager.
          if (androidInputManagerRef.current) {
            return androidInputManagerRef.current.handleDOMBeforeInput(event)
          }

          // Some IMEs/Chrome extensions like e.g. Grammarly set the selection immediately before
          // triggering a `beforeinput` expecting the change to be applied to the immediately before
          // set selection.
          scheduleOnDOMSelectionChange.flush()
          onDOMSelectionChange.flush()

          const { selection } = editor
          const { inputType: type } = event
          const data = (event as any).dataTransfer || event.data || undefined

          const isCompositionChange =
            type === 'insertCompositionText' || type === 'deleteCompositionText'

          // COMPAT: use composition change events as a hint to where we should insert
          // composition text if we aren't composing to work around https://github.com/ianstormtaylor/slate/issues/5038
          if (isCompositionChange && ReactEditor.isComposing(editor)) {
            return
          }

          let native = false
          if (
            type === 'insertText' &&
            selection &&
            Range.isCollapsed(selection) &&
            // Only use native character insertion for single characters a-z or space for now.
            // Long-press events (hold a + press 4 = ä) to choose a special character otherwise
            // causes duplicate inserts.
            event.data &&
            event.data.length === 1 &&
            /[a-z ]/i.test(event.data) &&
            // Chrome has issues correctly editing the start of nodes: https://bugs.chromium.org/p/chromium/issues/detail?id=1249405
            // When there is an inline element, e.g. a link, and you select
            // right after it (the start of the next node).
            selection.anchor.offset !== 0
          ) {
            native = true

            // Skip native if there are marks, as
            // `insertText` will insert a node, not just text.
            if (editor.marks) {
              native = false
            }

            // If the NODE_MAP is dirty, we can't trust the selection anchor (eg ReactEditor.toDOMPoint)
            if (!IS_NODE_MAP_DIRTY.get(editor)) {
              // Chrome also has issues correctly editing the end of anchor elements: https://bugs.chromium.org/p/chromium/issues/detail?id=1259100
              // Therefore we don't allow native events to insert text at the end of anchor nodes.
              const { anchor } = selection

              const [node, offset] = ReactEditor.toDOMPoint(editor, anchor)
              const anchorNode = node.parentElement?.closest('a')

              const window = ReactEditor.getWindow(editor)

              if (
                native &&
                anchorNode &&
                ReactEditor.hasDOMNode(editor, anchorNode)
              ) {
                // Find the last text node inside the anchor.
                const lastText = window?.document
                  .createTreeWalker(anchorNode, NodeFilter.SHOW_TEXT)
                  .lastChild() as DOMText | null

                if (
                  lastText === node &&
                  lastText.textContent?.length === offset
                ) {
                  native = false
                }
              }

              // Chrome has issues with the presence of tab characters inside elements with whiteSpace = 'pre'
              // causing abnormal insert behavior: https://bugs.chromium.org/p/chromium/issues/detail?id=1219139
              if (
                native &&
                node.parentElement &&
                window?.getComputedStyle(node.parentElement)?.whiteSpace ===
                  'pre'
              ) {
                const block = Editor.above(editor, {
                  at: anchor.path,
                  match: n => Element.isElement(n) && Editor.isBlock(editor, n),
                })

                if (block && Node.string(block[0]).includes('\t')) {
                  native = false
                }
              }
            }
          }
          // COMPAT: For the deleting forward/backward input types we don't want
          // to change the selection because it is the range that will be deleted,
          // and those commands determine that for themselves.
          // If the NODE_MAP is dirty, we can't trust the selection anchor (eg ReactEditor.toDOMPoint via ReactEditor.toSlateRange)
          if (
            (!type.startsWith('delete') || type.startsWith('deleteBy')) &&
            !IS_NODE_MAP_DIRTY.get(editor)
          ) {
            const [targetRange] = (event as any).getTargetRanges()

            if (targetRange) {
              const range = ReactEditor.toSlateRange(editor, targetRange, {
                exactMatch: false,
                suppressThrow: false,
              })

              if (!selection || !Range.equals(selection, range)) {
                native = false

                const selectionRef =
                  !isCompositionChange &&
                  editor.selection &&
                  Editor.rangeRef(editor, editor.selection)

                Transforms.select(editor, range)

                if (selectionRef) {
                  EDITOR_TO_USER_SELECTION.set(editor, selectionRef)
                }
              }
            }
          }

          // Composition change types occur while a user is composing text and can't be
          // cancelled. Let them through and wait for the composition to end.
          if (isCompositionChange) {
            return
          }

          if (!native) {
            event.preventDefault()
          }

          // COMPAT: If the selection is expanded, even if the command seems like
          // a delete forward/backward command it should delete the selection.
          if (
            selection &&
            Range.isExpanded(selection) &&
            type.startsWith('delete')
          ) {
            const direction = type.endsWith('Backward') ? 'backward' : 'forward'
            Editor.deleteFragment(editor, { direction })
            return
          }

          switch (type) {
            case 'deleteByComposition':
            case 'deleteByCut':
            case 'deleteByDrag': {
              Editor.deleteFragment(editor)
              break
            }

            case 'deleteContent':
            case 'deleteContentForward': {
              Editor.deleteForward(editor)
              break
            }

            case 'deleteContentBackward': {
              Editor.deleteBackward(editor)
              break
            }

            case 'deleteEntireSoftLine': {
              Editor.deleteBackward(editor, { unit: 'line' })
              Editor.deleteForward(editor, { unit: 'line' })
              break
            }

            case 'deleteHardLineBackward': {
              Editor.deleteBackward(editor, { unit: 'block' })
              break
            }

            case 'deleteSoftLineBackward': {
              Editor.deleteBackward(editor, { unit: 'line' })
              break
            }

            case 'deleteHardLineForward': {
              Editor.deleteForward(editor, { unit: 'block' })
              break
            }

            case 'deleteSoftLineForward': {
              Editor.deleteForward(editor, { unit: 'line' })
              break
            }

            case 'deleteWordBackward': {
              Editor.deleteBackward(editor, { unit: 'word' })
              break
            }

            case 'deleteWordForward': {
              Editor.deleteForward(editor, { unit: 'word' })
              break
            }

            case 'insertLineBreak':
              Editor.insertSoftBreak(editor)
              break

            case 'insertParagraph': {
              Editor.insertBreak(editor)
              break
            }

            case 'insertFromComposition':
            case 'insertFromDrop':
            case 'insertFromPaste':
            case 'insertFromYank':
            case 'insertReplacementText':
            case 'insertText': {
              if (type === 'insertFromComposition') {
                // COMPAT: in Safari, `compositionend` is dispatched after the
                // `beforeinput` for "insertFromComposition". But if we wait for it
                // then we will abort because we're still composing and the selection
                // won't be updated properly.
                // https://www.w3.org/TR/input-events-2/
                if (ReactEditor.isComposing(editor)) {
                  setIsComposing(false)
                  IS_COMPOSING.set(editor, false)
                }
              }

              // use a weak comparison instead of 'instanceof' to allow
              // programmatic access of paste events coming from external windows
              // like cypress where cy.window does not work realibly
              if (data?.constructor.name === 'DataTransfer') {
                ReactEditor.insertData(editor, data)
              } else if (typeof data === 'string') {
                // Only insertText operations use the native functionality, for now.
                // Potentially expand to single character deletes, as well.
                if (native) {
                  deferredOperations.current.push(() =>
                    Editor.insertText(editor, data)
                  )
                } else {
                  Editor.insertText(editor, data)
                }
              }

              break
            }
          }

          // Restore the actual user section if nothing manually set it.
          const toRestore = EDITOR_TO_USER_SELECTION.get(editor)?.unref()
          EDITOR_TO_USER_SELECTION.delete(editor)

          if (
            toRestore &&
            (!editor.selection || !Range.equals(editor.selection, toRestore))
          ) {
            Transforms.select(editor, toRestore)
          }
        }
      },
      [
        editor,
        onDOMSelectionChange,
        onUserInput,
        propsOnDOMBeforeInput,
        readOnly,
        scheduleOnDOMSelectionChange,
      ]
    )

    const callbackRef = useCallback(
      (node: HTMLDivElement | null) => {
        if (node == null) {
          onDOMSelectionChange.cancel()
          scheduleOnDOMSelectionChange.cancel()

          EDITOR_TO_ELEMENT.delete(editor)
          NODE_TO_ELEMENT.delete(editor)

          if (ref.current && HAS_BEFORE_INPUT_SUPPORT) {
            // @ts-ignore The `beforeinput` event isn't recognized.
            ref.current.removeEventListener('beforeinput', onDOMBeforeInput)
          }
        } else {
          // Attach a native DOM event handler for `beforeinput` events, because React's
          // built-in `onBeforeInput` is actually a leaky polyfill that doesn't expose
          // real `beforeinput` events sadly... (2019/11/04)
          // https://github.com/facebook/react/issues/11211
          if (HAS_BEFORE_INPUT_SUPPORT) {
            // @ts-ignore The `beforeinput` event isn't recognized.
            node.addEventListener('beforeinput', onDOMBeforeInput)
          }
        }

        ref.current = node
        if (typeof forwardedRef === 'function') {
          forwardedRef(node)
        } else if (forwardedRef) {
          forwardedRef.current = node
        }
      },
      [
        onDOMSelectionChange,
        scheduleOnDOMSelectionChange,
        editor,
        onDOMBeforeInput,
        forwardedRef,
      ]
    )

    useIsomorphicLayoutEffect(() => {
      const window = ReactEditor.getWindow(editor)

      // COMPAT: In Chrome, `selectionchange` events can fire when <input> and
      // <textarea> elements are appended to the DOM, causing
      // `editor.selection` to be overwritten in some circumstances.
      // (2025/01/16) https://issues.chromium.org/issues/389368412
      const onSelectionChange = ({ target }: Event) => {
        const targetElement = target instanceof HTMLElement ? target : null
        const targetTagName = targetElement?.tagName
        if (targetTagName === 'INPUT' || targetTagName === 'TEXTAREA') {
          return
        }
        scheduleOnDOMSelectionChange()
      }

      // Attach a native DOM event handler for `selectionchange`, because React's
      // built-in `onSelect` handler doesn't fire for all selection changes. It's
      // a leaky polyfill that only fires on keypresses or clicks. Instead, we
      // want to fire for any change to the selection inside the editor.
      // (2019/11/04) https://github.com/facebook/react/issues/5785
      window.document.addEventListener('selectionchange', onSelectionChange)

      // Listen for dragend and drop globally. In Firefox, if a drop handler
      // initiates an operation that causes the originally dragged element to
      // unmount, that element will not emit a dragend event. (2024/06/21)
      const stoppedDragging = () => {
        state.isDraggingInternally = false
      }
      window.document.addEventListener('dragend', stoppedDragging)
      window.document.addEventListener('drop', stoppedDragging)

      return () => {
        window.document.removeEventListener(
          'selectionchange',
          onSelectionChange
        )
        window.document.removeEventListener('dragend', stoppedDragging)
        window.document.removeEventListener('drop', stoppedDragging)
      }
    }, [scheduleOnDOMSelectionChange, state])

    const decorations = decorate([editor, []])
    const decorateContext = useDecorateContext(decorate)

    const showPlaceholder =
      placeholder &&
      editor.children.length === 1 &&
      Array.from(Node.texts(editor)).length === 1 &&
      Node.string(editor) === '' &&
      !isComposing

    const placeHolderResizeHandler = useCallback(
      (placeholderEl: HTMLElement | null) => {
        if (placeholderEl && showPlaceholder) {
          setPlaceholderHeight(placeholderEl.getBoundingClientRect()?.height)
        } else {
          setPlaceholderHeight(undefined)
        }
      },
      [showPlaceholder]
    )

    if (showPlaceholder) {
      const start = Editor.start(editor, [])
      decorations.push({
        [PLACEHOLDER_SYMBOL]: true,
        placeholder,
        onPlaceholderResize: placeHolderResizeHandler,
        anchor: start,
        focus: start,
      })
    }

    const { marks } = editor
    state.hasMarkPlaceholder = false

    if (editor.selection && Range.isCollapsed(editor.selection) && marks) {
      const { anchor } = editor.selection
      const leaf = Node.leaf(editor, anchor.path)
      const { text, ...rest } = leaf

      // While marks isn't a 'complete' text, we can still use loose Text.equals
      // here which only compares marks anyway.
      if (!Text.equals(leaf, marks as Text, { loose: true })) {
        state.hasMarkPlaceholder = true

        const unset = Object.fromEntries(
          Object.keys(rest).map(mark => [mark, null])
        )

        decorations.push({
          [MARK_PLACEHOLDER_SYMBOL]: true,
          ...unset,
          ...marks,

          anchor,
          focus: anchor,
        })
      }
    }

    // Update EDITOR_TO_MARK_PLACEHOLDER_MARKS in setTimeout useEffect to ensure we don't set it
    // before we receive the composition end event.
    useEffect(() => {
      setTimeout(() => {
        const { selection } = editor
        if (selection) {
          const { anchor } = selection
          const text = Node.leaf(editor, anchor.path)

          // While marks isn't a 'complete' text, we can still use loose Text.equals
          // here which only compares marks anyway.
          if (marks && !Text.equals(text, marks as Text, { loose: true })) {
            EDITOR_TO_PENDING_INSERTION_MARKS.set(editor, marks)
            return
          }
        }

        EDITOR_TO_PENDING_INSERTION_MARKS.delete(editor)
      })
    })

    useFlushDeferredSelectorsOnRender()

    return (
      <ReadOnlyContext.Provider value={readOnly}>
        <ComposingContext.Provider value={isComposing}>
          <DecorateContext.Provider value={decorateContext}>
            <RestoreDOM node={ref} receivedUserInput={receivedUserInput}>
              <Component
                role={readOnly ? undefined : 'textbox'}
                aria-multiline={readOnly ? undefined : true}
                {...attributes}
                // COMPAT: Certain browsers don't support the `beforeinput` event, so we'd
                // have to use hacks to make these replacement-based features work.
                // For SSR situations HAS_BEFORE_INPUT_SUPPORT is false and results in prop
                // mismatch warning app moves to browser. Pass-through consumer props when
                // not CAN_USE_DOM (SSR) and default to falsy value
                spellCheck={
                  HAS_BEFORE_INPUT_SUPPORT || !CAN_USE_DOM
                    ? attributes.spellCheck
                    : false
                }
                autoCorrect={
                  HAS_BEFORE_INPUT_SUPPORT || !CAN_USE_DOM
                    ? attributes.autoCorrect
                    : 'false'
                }
                autoCapitalize={
                  HAS_BEFORE_INPUT_SUPPORT || !CAN_USE_DOM
                    ? attributes.autoCapitalize
                    : 'false'
                }
                data-slate-editor
                data-slate-node="value"
                // explicitly set this
                contentEditable={!readOnly}
                // in some cases, a decoration needs access to the range / selection to decorate a text node,
                // then you will select the whole text node when you select part the of text
                // this magic zIndex="-1" will fix it
                zindex={-1}
                suppressContentEditableWarning
                ref={callbackRef}
                style={{
                  ...(disableDefaultStyles
                    ? {}
                    : {
                        // Allow positioning relative to the editable element.
                        position: 'relative',
                        // Preserve adjacent whitespace and new lines.
                        whiteSpace: 'pre-wrap',
                        // Allow words to break if they are too long.
                        wordWrap: 'break-word',
                        // Make the minimum height that of the placeholder.
                        ...(placeholderHeight
                          ? { minHeight: placeholderHeight }
                          : {}),
                      }),
                  // Allow for passed-in styles to override anything.
                  ...userStyle,
                }}
                onBeforeInput={useCallback(
                  (event: React.FormEvent<HTMLDivElement>) => {
                    // COMPAT: Certain browsers don't support the `beforeinput` event, so we
                    // fall back to React's leaky polyfill instead just for it. It
                    // only works for the `insertText` input type.
                    if (
                      !HAS_BEFORE_INPUT_SUPPORT &&
                      !readOnly &&
                      !isEventHandled(event, attributes.onBeforeInput) &&
                      ReactEditor.hasSelectableTarget(editor, event.target)
                    ) {
                      event.preventDefault()
                      if (!ReactEditor.isComposing(editor)) {
                        const text = (event as any).data as string
                        Editor.insertText(editor, text)
                      }
                    }
                  },
                  [attributes.onBeforeInput, editor, readOnly]
                )}
                onInput={useCallback(
                  (event: React.FormEvent<HTMLDivElement>) => {
                    if (isEventHandled(event, attributes.onInput)) {
                      return
                    }

                    if (androidInputManagerRef.current) {
                      androidInputManagerRef.current.handleInput()
                      return
                    }

                    // Flush native operations, as native events will have propogated
                    // and we can correctly compare DOM text values in components
                    // to stop rendering, so that browser functions like autocorrect
                    // and spellcheck work as expected.
                    for (const op of deferredOperations.current) {
                      op()
                    }
                    deferredOperations.current = []

                    // COMPAT: Since `beforeinput` doesn't fully `preventDefault`,
                    // there's a chance that content might be placed in the browser's undo stack.
                    // This means undo can be triggered even when the div is not focused,
                    // and it only triggers the input event for the node. (2024/10/09)
                    if (!ReactEditor.isFocused(editor)) {
                      handleNativeHistoryEvents(
                        editor,
                        event.nativeEvent as InputEvent
                      )
                    }
                  },
                  [attributes.onInput, editor]
                )}
                onBlur={useCallback(
                  (event: React.FocusEvent<HTMLDivElement>) => {
                    if (
                      readOnly ||
                      state.isUpdatingSelection ||
                      !ReactEditor.hasSelectableTarget(editor, event.target) ||
                      isEventHandled(event, attributes.onBlur)
                    ) {
                      return
                    }

                    // COMPAT: If the current `activeElement` is still the previous
                    // one, this is due to the window being blurred when the tab
                    // itself becomes unfocused, so we want to abort early to allow to
                    // editor to stay focused when the tab becomes focused again.
                    const root = ReactEditor.findDocumentOrShadowRoot(editor)
                    if (state.latestElement === root.activeElement) {
                      return
                    }

                    const { relatedTarget } = event
                    const el = ReactEditor.toDOMNode(editor, editor)

                    // COMPAT: The event should be ignored if the focus is returning
                    // to the editor from an embedded editable element (eg. an <input>
                    // element inside a void node).
                    if (relatedTarget === el) {
                      return
                    }

                    // COMPAT: The event should be ignored if the focus is moving from
                    // the editor to inside a void node's spacer element.
                    if (
                      isDOMElement(relatedTarget) &&
                      relatedTarget.hasAttribute('data-slate-spacer')
                    ) {
                      return
                    }

                    // COMPAT: The event should be ignored if the focus is moving to a
                    // non- editable section of an element that isn't a void node (eg.
                    // a list item of the check list example).
                    if (
                      relatedTarget != null &&
                      isDOMNode(relatedTarget) &&
                      ReactEditor.hasDOMNode(editor, relatedTarget)
                    ) {
                      const node = ReactEditor.toSlateNode(
                        editor,
                        relatedTarget
                      )

                      if (Element.isElement(node) && !editor.isVoid(node)) {
                        return
                      }
                    }

                    // COMPAT: Safari doesn't always remove the selection even if the content-
                    // editable element no longer has focus. Refer to:
                    // https://stackoverflow.com/questions/12353247/force-contenteditable-div-to-stop-accepting-input-after-it-loses-focus-under-web
                    if (IS_WEBKIT) {
                      const domSelection = getSelection(root)
                      domSelection?.removeAllRanges()
                    }

                    IS_FOCUSED.delete(editor)
                  },
                  [
                    readOnly,
                    state.isUpdatingSelection,
                    state.latestElement,
                    editor,
                    attributes.onBlur,
                  ]
                )}
                onClick={useCallback(
                  (event: React.MouseEvent<HTMLDivElement>) => {
                    if (
                      ReactEditor.hasTarget(editor, event.target) &&
                      !isEventHandled(event, attributes.onClick) &&
                      isDOMNode(event.target)
                    ) {
                      const node = ReactEditor.toSlateNode(editor, event.target)
                      const path = ReactEditor.findPath(editor, node)

                      // At this time, the Slate document may be arbitrarily different,
                      // because onClick handlers can change the document before we get here.
                      // Therefore we must check that this path actually exists,
                      // and that it still refers to the same node.
                      if (
                        !Editor.hasPath(editor, path) ||
                        Node.get(editor, path) !== node
                      ) {
                        return
                      }

                      if (event.detail === TRIPLE_CLICK && path.length >= 1) {
                        let blockPath = path
                        if (
                          !(
                            Element.isElement(node) &&
                            Editor.isBlock(editor, node)
                          )
                        ) {
                          const block = Editor.above(editor, {
                            match: n =>
                              Element.isElement(n) && Editor.isBlock(editor, n),
                            at: path,
                          })

                          blockPath = block?.[1] ?? path.slice(0, 1)
                        }

                        const range = Editor.range(editor, blockPath)
                        Transforms.select(editor, range)
                        return
                      }

                      if (readOnly) {
                        return
                      }

                      const start = Editor.start(editor, path)
                      const end = Editor.end(editor, path)
                      const startVoid = Editor.void(editor, { at: start })
                      const endVoid = Editor.void(editor, { at: end })

                      if (
                        startVoid &&
                        endVoid &&
                        Path.equals(startVoid[1], endVoid[1])
                      ) {
                        const range = Editor.range(editor, start)
                        Transforms.select(editor, range)
                      }
                    }
                  },
                  [editor, attributes.onClick, readOnly]
                )}
                onCompositionEnd={useCallback(
                  (event: React.CompositionEvent<HTMLDivElement>) => {
                    if (ReactEditor.hasSelectableTarget(editor, event.target)) {
                      if (ReactEditor.isComposing(editor)) {
                        Promise.resolve().then(() => {
                          setIsComposing(false)
                          IS_COMPOSING.set(editor, false)
                        })
                      }

                      androidInputManagerRef.current?.handleCompositionEnd(
                        event
                      )

                      if (
                        isEventHandled(event, attributes.onCompositionEnd) ||
                        IS_ANDROID
                      ) {
                        return
                      }

                      // COMPAT: In Chrome, `beforeinput` events for compositions
                      // aren't correct and never fire the "insertFromComposition"
                      // type that we need. So instead, insert whenever a composition
                      // ends since it will already have been committed to the DOM.
                      if (
                        !IS_WEBKIT &&
                        !IS_FIREFOX_LEGACY &&
                        !IS_IOS &&
                        !IS_WECHATBROWSER &&
                        !IS_UC_MOBILE &&
                        event.data
                      ) {
                        const placeholderMarks =
                          EDITOR_TO_PENDING_INSERTION_MARKS.get(editor)
                        EDITOR_TO_PENDING_INSERTION_MARKS.delete(editor)

                        // Ensure we insert text with the marks the user was actually seeing
                        if (placeholderMarks !== undefined) {
                          EDITOR_TO_USER_MARKS.set(editor, editor.marks)
                          editor.marks = placeholderMarks
                        }

                        Editor.insertText(editor, event.data)

                        const userMarks = EDITOR_TO_USER_MARKS.get(editor)
                        EDITOR_TO_USER_MARKS.delete(editor)
                        if (userMarks !== undefined) {
                          editor.marks = userMarks
                        }
                      }
                    }
                  },
                  [attributes.onCompositionEnd, editor]
                )}
                onCompositionUpdate={useCallback(
                  (event: React.CompositionEvent<HTMLDivElement>) => {
                    if (
                      ReactEditor.hasSelectableTarget(editor, event.target) &&
                      !isEventHandled(event, attributes.onCompositionUpdate)
                    ) {
                      if (!ReactEditor.isComposing(editor)) {
                        setIsComposing(true)
                        IS_COMPOSING.set(editor, true)
                      }
                    }
                  },
                  [attributes.onCompositionUpdate, editor]
                )}
                onCompositionStart={useCallback(
                  (event: React.CompositionEvent<HTMLDivElement>) => {
                    if (ReactEditor.hasSelectableTarget(editor, event.target)) {
                      androidInputManagerRef.current?.handleCompositionStart(
                        event
                      )

                      if (
                        isEventHandled(event, attributes.onCompositionStart) ||
                        IS_ANDROID
                      ) {
                        return
                      }

                      setIsComposing(true)

                      const { selection } = editor
                      if (selection && Range.isExpanded(selection)) {
                        Editor.deleteFragment(editor)
                        return
                      }
                    }
                  },
                  [attributes.onCompositionStart, editor]
                )}
                onCopy={useCallback(
                  (event: React.ClipboardEvent<HTMLDivElement>) => {
                    if (
                      ReactEditor.hasSelectableTarget(editor, event.target) &&
                      !isEventHandled(event, attributes.onCopy) &&
                      !isDOMEventTargetInput(event)
                    ) {
                      event.preventDefault()
                      ReactEditor.setFragmentData(
                        editor,
                        event.clipboardData,
                        'copy'
                      )
                    }
                  },
                  [attributes.onCopy, editor]
                )}
                onCut={useCallback(
                  (event: React.ClipboardEvent<HTMLDivElement>) => {
                    if (
                      !readOnly &&
                      ReactEditor.hasSelectableTarget(editor, event.target) &&
                      !isEventHandled(event, attributes.onCut) &&
                      !isDOMEventTargetInput(event)
                    ) {
                      event.preventDefault()
                      ReactEditor.setFragmentData(
                        editor,
                        event.clipboardData,
                        'cut'
                      )
                      const { selection } = editor

                      if (selection) {
                        if (Range.isExpanded(selection)) {
                          Editor.deleteFragment(editor)
                        } else {
                          const node = Node.parent(
                            editor,
                            selection.anchor.path
                          )
                          if (Editor.isVoid(editor, node)) {
                            Transforms.delete(editor)
                          }
                        }
                      }
                    }
                  },
                  [readOnly, editor, attributes.onCut]
                )}
                onDragOver={useCallback(
                  (event: React.DragEvent<HTMLDivElement>) => {
                    if (
                      ReactEditor.hasTarget(editor, event.target) &&
                      !isEventHandled(event, attributes.onDragOver)
                    ) {
                      // Only when the target is void, call `preventDefault` to signal
                      // that drops are allowed. Editable content is droppable by
                      // default, and calling `preventDefault` hides the cursor.
                      const node = ReactEditor.toSlateNode(editor, event.target)

                      if (
                        Element.isElement(node) &&
                        Editor.isVoid(editor, node)
                      ) {
                        event.preventDefault()
                      }
                    }
                  },
                  [attributes.onDragOver, editor]
                )}
                onDragStart={useCallback(
                  (event: React.DragEvent<HTMLDivElement>) => {
                    if (
                      !readOnly &&
                      ReactEditor.hasTarget(editor, event.target) &&
                      !isEventHandled(event, attributes.onDragStart)
                    ) {
                      const node = ReactEditor.toSlateNode(editor, event.target)
                      const path = ReactEditor.findPath(editor, node)
                      const voidMatch =
                        (Element.isElement(node) &&
                          Editor.isVoid(editor, node)) ||
                        Editor.void(editor, { at: path, voids: true })

                      // If starting a drag on a void node, make sure it is selected
                      // so that it shows up in the selection's fragment.
                      if (voidMatch) {
                        const range = Editor.range(editor, path)
                        Transforms.select(editor, range)
                      }

                      state.isDraggingInternally = true

                      ReactEditor.setFragmentData(
                        editor,
                        event.dataTransfer,
                        'drag'
                      )
                    }
                  },
                  [readOnly, editor, attributes.onDragStart, state]
                )}
                onDrop={useCallback(
                  (event: React.DragEvent<HTMLDivElement>) => {
                    if (
                      !readOnly &&
                      ReactEditor.hasTarget(editor, event.target) &&
                      !isEventHandled(event, attributes.onDrop)
                    ) {
                      event.preventDefault()

                      // Keep a reference to the dragged range before updating selection
                      const draggedRange = editor.selection

                      // Find the range where the drop happened
                      const range = ReactEditor.findEventRange(editor, event)
                      const data = event.dataTransfer

                      Transforms.select(editor, range)

                      if (state.isDraggingInternally) {
                        if (
                          draggedRange &&
                          !Range.equals(draggedRange, range) &&
                          !Editor.void(editor, { at: range, voids: true })
                        ) {
                          Transforms.delete(editor, {
                            at: draggedRange,
                          })
                        }
                      }

                      ReactEditor.insertData(editor, data)

                      // When dragging from another source into the editor, it's possible
                      // that the current editor does not have focus.
                      if (!ReactEditor.isFocused(editor)) {
                        ReactEditor.focus(editor)
                      }
                    }
                  },
                  [readOnly, editor, attributes.onDrop, state]
                )}
                onDragEnd={useCallback(
                  (event: React.DragEvent<HTMLDivElement>) => {
                    if (
                      !readOnly &&
                      state.isDraggingInternally &&
                      attributes.onDragEnd &&
                      ReactEditor.hasTarget(editor, event.target)
                    ) {
                      attributes.onDragEnd(event)
                    }
                  },
                  [readOnly, state, attributes, editor]
                )}
                onFocus={useCallback(
                  (event: React.FocusEvent<HTMLDivElement>) => {
                    if (
                      !readOnly &&
                      !state.isUpdatingSelection &&
                      ReactEditor.hasEditableTarget(editor, event.target) &&
                      !isEventHandled(event, attributes.onFocus)
                    ) {
                      const el = ReactEditor.toDOMNode(editor, editor)
                      const root = ReactEditor.findDocumentOrShadowRoot(editor)
                      state.latestElement = root.activeElement

                      // COMPAT: If the editor has nested editable elements, the focus
                      // can go to them. In Firefox, this must be prevented because it
                      // results in issues with keyboard navigation. (2017/03/30)
                      if (IS_FIREFOX && event.target !== el) {
                        el.focus()
                        return
                      }

                      IS_FOCUSED.set(editor, true)
                    }
                  },
                  [readOnly, state, editor, attributes.onFocus]
                )}
                onKeyDown={useCallback(
                  (event: React.KeyboardEvent<HTMLDivElement>) => {
                    if (
                      !readOnly &&
                      ReactEditor.hasEditableTarget(editor, event.target)
                    ) {
                      androidInputManagerRef.current?.handleKeyDown(event)

                      const { nativeEvent } = event

                      // COMPAT: The composition end event isn't fired reliably in all browsers,
                      // so we sometimes might end up stuck in a composition state even though we
                      // aren't composing any more.
                      if (
                        ReactEditor.isComposing(editor) &&
                        nativeEvent.isComposing === false
                      ) {
                        IS_COMPOSING.set(editor, false)
                        setIsComposing(false)
                      }

                      if (
                        isEventHandled(event, attributes.onKeyDown) ||
                        ReactEditor.isComposing(editor)
                      ) {
                        return
                      }

                      const { selection } = editor
                      const element =
                        editor.children[
                          selection !== null ? selection.focus.path[0] : 0
                        ]
                      const isRTL = getDirection(Node.string(element)) === 'rtl'

                      // COMPAT: Since we prevent the default behavior on
                      // `beforeinput` events, the browser doesn't think there's ever
                      // any history stack to undo or redo, so we have to manage these
                      // hotkeys ourselves. (2019/11/06)
                      if (Hotkeys.isRedo(nativeEvent)) {
                        event.preventDefault()
                        const maybeHistoryEditor: any = editor

                        if (typeof maybeHistoryEditor.redo === 'function') {
                          maybeHistoryEditor.redo()
                        }

                        return
                      }

                      if (Hotkeys.isUndo(nativeEvent)) {
                        event.preventDefault()
                        const maybeHistoryEditor: any = editor

                        if (typeof maybeHistoryEditor.undo === 'function') {
                          maybeHistoryEditor.undo()
                        }

                        return
                      }

                      // COMPAT: Certain browsers don't handle the selection updates
                      // properly. In Chrome, the selection isn't properly extended.
                      // And in Firefox, the selection isn't properly collapsed.
                      // (2017/10/17)
                      if (Hotkeys.isMoveLineBackward(nativeEvent)) {
                        event.preventDefault()
                        Transforms.move(editor, { unit: 'line', reverse: true })
                        return
                      }

                      if (Hotkeys.isMoveLineForward(nativeEvent)) {
                        event.preventDefault()
                        Transforms.move(editor, { unit: 'line' })
                        return
                      }

                      if (Hotkeys.isExtendLineBackward(nativeEvent)) {
                        event.preventDefault()
                        Transforms.move(editor, {
                          unit: 'line',
                          edge: 'focus',
                          reverse: true,
                        })
                        return
                      }

                      if (Hotkeys.isExtendLineForward(nativeEvent)) {
                        event.preventDefault()
                        Transforms.move(editor, { unit: 'line', edge: 'focus' })
                        return
                      }

                      // COMPAT: If a void node is selected, or a zero-width text node
                      // adjacent to an inline is selected, we need to handle these
                      // hotkeys manually because browsers won't be able to skip over
                      // the void node with the zero-width space not being an empty
                      // string.
                      if (Hotkeys.isMoveBackward(nativeEvent)) {
                        event.preventDefault()

                        if (selection && Range.isCollapsed(selection)) {
                          Transforms.move(editor, { reverse: !isRTL })
                        } else {
                          Transforms.collapse(editor, {
                            edge: isRTL ? 'end' : 'start',
                          })
                        }

                        return
                      }

                      if (Hotkeys.isMoveForward(nativeEvent)) {
                        event.preventDefault()

                        if (selection && Range.isCollapsed(selection)) {
                          Transforms.move(editor, { reverse: isRTL })
                        } else {
                          Transforms.collapse(editor, {
                            edge: isRTL ? 'start' : 'end',
                          })
                        }

                        return
                      }

                      if (Hotkeys.isMoveWordBackward(nativeEvent)) {
                        event.preventDefault()

                        if (selection && Range.isExpanded(selection)) {
                          Transforms.collapse(editor, { edge: 'focus' })
                        }

                        Transforms.move(editor, {
                          unit: 'word',
                          reverse: !isRTL,
                        })
                        return
                      }

                      if (Hotkeys.isMoveWordForward(nativeEvent)) {
                        event.preventDefault()

                        if (selection && Range.isExpanded(selection)) {
                          Transforms.collapse(editor, { edge: 'focus' })
                        }

                        Transforms.move(editor, {
                          unit: 'word',
                          reverse: isRTL,
                        })
                        return
                      }

                      // COMPAT: Certain browsers don't support the `beforeinput` event, so we
                      // fall back to guessing at the input intention for hotkeys.
                      // COMPAT: In iOS, some of these hotkeys are handled in the
                      if (!HAS_BEFORE_INPUT_SUPPORT) {
                        // We don't have a core behavior for these, but they change the
                        // DOM if we don't prevent them, so we have to.
                        if (
                          Hotkeys.isBold(nativeEvent) ||
                          Hotkeys.isItalic(nativeEvent) ||
                          Hotkeys.isTransposeCharacter(nativeEvent)
                        ) {
                          event.preventDefault()
                          return
                        }

                        if (Hotkeys.isSoftBreak(nativeEvent)) {
                          event.preventDefault()
                          Editor.insertSoftBreak(editor)
                          return
                        }

                        if (Hotkeys.isSplitBlock(nativeEvent)) {
                          event.preventDefault()
                          Editor.insertBreak(editor)
                          return
                        }

                        if (Hotkeys.isDeleteBackward(nativeEvent)) {
                          event.preventDefault()

                          if (selection && Range.isExpanded(selection)) {
                            Editor.deleteFragment(editor, {
                              direction: 'backward',
                            })
                          } else {
                            Editor.deleteBackward(editor)
                          }

                          return
                        }

                        if (Hotkeys.isDeleteForward(nativeEvent)) {
                          event.preventDefault()

                          if (selection && Range.isExpanded(selection)) {
                            Editor.deleteFragment(editor, {
                              direction: 'forward',
                            })
                          } else {
                            Editor.deleteForward(editor)
                          }

                          return
                        }

                        if (Hotkeys.isDeleteLineBackward(nativeEvent)) {
                          event.preventDefault()

                          if (selection && Range.isExpanded(selection)) {
                            Editor.deleteFragment(editor, {
                              direction: 'backward',
                            })
                          } else {
                            Editor.deleteBackward(editor, { unit: 'line' })
                          }

                          return
                        }

                        if (Hotkeys.isDeleteLineForward(nativeEvent)) {
                          event.preventDefault()

                          if (selection && Range.isExpanded(selection)) {
                            Editor.deleteFragment(editor, {
                              direction: 'forward',
                            })
                          } else {
                            Editor.deleteForward(editor, { unit: 'line' })
                          }

                          return
                        }

                        if (Hotkeys.isDeleteWordBackward(nativeEvent)) {
                          event.preventDefault()

                          if (selection && Range.isExpanded(selection)) {
                            Editor.deleteFragment(editor, {
                              direction: 'backward',
                            })
                          } else {
                            Editor.deleteBackward(editor, { unit: 'word' })
                          }

                          return
                        }

                        if (Hotkeys.isDeleteWordForward(nativeEvent)) {
                          event.preventDefault()

                          if (selection && Range.isExpanded(selection)) {
                            Editor.deleteFragment(editor, {
                              direction: 'forward',
                            })
                          } else {
                            Editor.deleteForward(editor, { unit: 'word' })
                          }

                          return
                        }
                      } else {
                        if (IS_CHROME || IS_WEBKIT) {
                          // COMPAT: Chrome and Safari support `beforeinput` event but do not fire
                          // an event when deleting backwards in a selected void inline node
                          if (
                            selection &&
                            (Hotkeys.isDeleteBackward(nativeEvent) ||
                              Hotkeys.isDeleteForward(nativeEvent)) &&
                            Range.isCollapsed(selection)
                          ) {
                            const currentNode = Node.parent(
                              editor,
                              selection.anchor.path
                            )

                            if (
                              Element.isElement(currentNode) &&
                              Editor.isVoid(editor, currentNode) &&
                              (Editor.isInline(editor, currentNode) ||
                                Editor.isBlock(editor, currentNode))
                            ) {
                              event.preventDefault()
                              Editor.deleteBackward(editor, { unit: 'block' })

                              return
                            }
                          }
                        }
                      }
                    }
                  },
                  [readOnly, editor, attributes.onKeyDown]
                )}
                onPaste={useCallback(
                  (event: React.ClipboardEvent<HTMLDivElement>) => {
                    if (
                      !readOnly &&
                      ReactEditor.hasEditableTarget(editor, event.target) &&
                      !isEventHandled(event, attributes.onPaste)
                    ) {
                      // COMPAT: Certain browsers don't support the `beforeinput` event, so we
                      // fall back to React's `onPaste` here instead.
                      // COMPAT: Firefox, Chrome and Safari don't emit `beforeinput` events
                      // when "paste without formatting" is used, so fallback. (2020/02/20)
                      // COMPAT: Safari InputEvents generated by pasting won't include
                      // application/x-slate-fragment items, so use the
                      // ClipboardEvent here. (2023/03/15)
                      if (
                        !HAS_BEFORE_INPUT_SUPPORT ||
                        isPlainTextOnlyPaste(event.nativeEvent) ||
                        IS_WEBKIT
                      ) {
                        event.preventDefault()
                        ReactEditor.insertData(editor, event.clipboardData)
                      }
                    }
                  },
                  [readOnly, editor, attributes.onPaste]
                )}
              >
                <Children
                  decorations={decorations}
                  node={editor}
                  renderElement={renderElement}
                  renderChunk={renderChunk}
                  renderPlaceholder={renderPlaceholder}
                  renderLeaf={renderLeaf}
                  renderText={renderText}
                />
              </Component>
            </RestoreDOM>
          </DecorateContext.Provider>
        </ComposingContext.Provider>
      </ReadOnlyContext.Provider>
    )
  }
)

/**
 * The props that get passed to renderPlaceholder
 */
export type RenderPlaceholderProps = {
  children: any
  attributes: {
    'data-slate-placeholder': boolean
    dir?: 'rtl'
    contentEditable: boolean
    ref: React.RefCallback<any>
    style: React.CSSProperties
  }
}

/**
 * The default placeholder element
 */

export const DefaultPlaceholder = ({
  attributes,
  children,
}: RenderPlaceholderProps) => (
  // COMPAT: Artificially add a line-break to the end on the placeholder element
  // to prevent Android IMEs to pick up its content in autocorrect and to auto-capitalize the first letter
  <span {...attributes}>
    {children}
    {IS_ANDROID && <br />}
  </span>
)

/**
 * A default memoized decorate function.
 */

export const defaultDecorate: (entry: NodeEntry) => DecoratedRange[] = () => []

/**
 * A default implement to scroll dom range into view.
 */

export const defaultScrollSelectionIntoView = (
  editor: ReactEditor,
  domRange: DOMRange
) => {
  // This was affecting the selection of multiple blocks and dragging behavior,
  // so enabled only if the selection has been collapsed.
  if (
    domRange.getBoundingClientRect &&
    (!editor.selection ||
      (editor.selection && Range.isCollapsed(editor.selection)))
  ) {
    const leafEl = domRange.startContainer.parentElement!

    // COMPAT: In Chrome, domRange.getBoundingClientRect() can return zero dimensions for valid ranges (e.g. line breaks).
    // When this happens, do not scroll like most editors do.
    const domRect = domRange.getBoundingClientRect()
    const isZeroDimensionRect =
      domRect.width === 0 &&
      domRect.height === 0 &&
      domRect.x === 0 &&
      domRect.y === 0

    if (isZeroDimensionRect) {
      const leafRect = leafEl.getBoundingClientRect()
      const leafHasDimensions = leafRect.width > 0 || leafRect.height > 0

      if (leafHasDimensions) {
        return
      }
    }

    // Default behavior: use domRange's getBoundingClientRect
    leafEl.getBoundingClientRect = domRange.getBoundingClientRect.bind(domRange)
    scrollIntoView(leafEl, {
      scrollMode: 'if-needed',
    })

    // @ts-expect-error an unorthodox delete D:
    delete leafEl.getBoundingClientRect
  }
}

/**
 * Check if an event is overrided by a handler.
 */

export const isEventHandled = <
  EventType extends React.SyntheticEvent<unknown, unknown>,
>(
  event: EventType,
  handler?: (event: EventType) => void | boolean
) => {
  if (!handler) {
    return false
  }
  // The custom event handler may return a boolean to specify whether the event
  // shall be treated as being handled or not.
  const shouldTreatEventAsHandled = handler(event)

  if (shouldTreatEventAsHandled != null) {
    return shouldTreatEventAsHandled
  }

  return event.isDefaultPrevented() || event.isPropagationStopped()
}

/**
 * Check if the event's target is an input element
 */
export const isDOMEventTargetInput = <
  EventType extends React.SyntheticEvent<unknown, unknown>,
>(
  event: EventType
) => {
  return (
    isDOMNode(event.target) &&
    (event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement)
  )
}

/**
 * Check if a DOM event is overrided by a handler.
 */

export const isDOMEventHandled = <E extends Event>(
  event: E,
  handler?: (event: E) => void | boolean
) => {
  if (!handler) {
    return false
  }

  // The custom event handler may return a boolean to specify whether the event
  // shall be treated as being handled or not.
  const shouldTreatEventAsHandled = handler(event)

  if (shouldTreatEventAsHandled != null) {
    return shouldTreatEventAsHandled
  }

  return event.defaultPrevented
}

const handleNativeHistoryEvents = (editor: Editor, event: InputEvent) => {
  const maybeHistoryEditor: any = editor
  if (
    event.inputType === 'historyUndo' &&
    typeof maybeHistoryEditor.undo === 'function'
  ) {
    maybeHistoryEditor.undo()
    return
  }
  if (
    event.inputType === 'historyRedo' &&
    typeof maybeHistoryEditor.redo === 'function'
  ) {
    maybeHistoryEditor.redo()
    return
  }
}
