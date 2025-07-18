import { unreachable } from 'devlop'
import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import { urlAttributes } from 'html-url-attributes'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import { useEffect, useMemo, useState } from 'react'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { VFile } from 'vfile'

const changelog =
    'https://github.com/remarkjs/react-markdown/blob/main/changelog.md'

/** @type {PluggableList} */
const emptyPlugins = []
/** @type {Readonly<RemarkRehypeOptions>} */
const emptyRemarkRehypeOptions = { allowDangerousHtml: true }
const safeProtocol = /^(https?|ircs?|mailto|xmpp)$/i

// Mutable because we `delete` any time it’s used and a message is sent.
/** @type {ReadonlyArray<Readonly<Deprecation>>} */
const deprecations = [
    { from: 'astPlugins', id: 'remove-buggy-html-in-markdown-parser' },
    { from: 'allowDangerousHtml', id: 'remove-buggy-html-in-markdown-parser' },
    {
        from: 'allowNode',
        id: 'replace-allownode-allowedtypes-and-disallowedtypes',
        to: 'allowElement'
    },
    {
        from: 'allowedTypes',
        id: 'replace-allownode-allowedtypes-and-disallowedtypes',
        to: 'allowedElements'
    },
    { from: 'className', id: 'remove-classname' },
    {
        from: 'disallowedTypes',
        id: 'replace-allownode-allowedtypes-and-disallowedtypes',
        to: 'disallowedElements'
    },
    { from: 'escapeHtml', id: 'remove-buggy-html-in-markdown-parser' },
    { from: 'includeElementIndex', id: '#remove-includeelementindex' },
    {
        from: 'includeNodeIndex',
        id: 'change-includenodeindex-to-includeelementindex'
    },
    { from: 'linkTarget', id: 'remove-linktarget' },
    { from: 'plugins', id: 'change-plugins-to-remarkplugins', to: 'remarkPlugins' },
    { from: 'rawSourcePos', id: '#remove-rawsourcepos' },
    { from: 'renderers', id: 'change-renderers-to-components', to: 'components' },
    { from: 'source', id: 'change-source-to-children', to: 'children' },
    { from: 'sourcePos', id: '#remove-sourcepos' },
    { from: 'transformImageUri', id: '#add-urltransform', to: 'urlTransform' },
    { from: 'transformLinkUri', id: '#add-urltransform', to: 'urlTransform' }
]

/**
* Component to render markdown.
*
* This is a synchronous component.
* When using async plugins,
* see {@linkcode MarkdownAsync} or {@linkcode MarkdownHooks}.
*
* @param {Readonly<Options>} options
*   Props.
* @returns {ReactElement}
*   React element.
*/
export function Markdown(options) {
    const processor = createProcessor(options)
    const file = createFile(options)
    return post(processor.runSync(processor.parse(file), file), options)
}

/**
* Component to render markdown with support for async plugins
* through async/await.
*
* Components returning promises are supported on the server.
* For async support on the client,
* see {@linkcode MarkdownHooks}.
*
* @param {Readonly<Options>} options
*   Props.
* @returns {Promise<ReactElement>}
*   Promise to a React element.
*/
export async function MarkdownAsync(options) {
    const processor = createProcessor(options)
    const file = createFile(options)
    const tree = await processor.run(processor.parse(file), file)
    return post(tree, options)
}

/**
* Component to render markdown with support for async plugins through hooks.
*
* This uses `useEffect` and `useState` hooks.
* Hooks run on the client and do not immediately render something.
* For async support on the server,
* see {@linkcode MarkdownAsync}.
*
* @param {Readonly<HooksOptions>} options
*   Props.
* @returns {ReactNode}
*   React node.
*/
export function MarkdownHooks(options) {
    const processor = useMemo(
        function () {
            return createProcessor(options)
        },
        [options.rehypePlugins, options.remarkPlugins, options.remarkRehypeOptions]
    )
    const [error, setError] = useState(
   /** @type {Error | undefined} */(undefined)
    )
    const [tree, setTree] = useState(/** @type {Root | undefined} */(undefined))

    useEffect(
        function () {
            let cancelled = false
            const file = createFile(options)

            processor.run(processor.parse(file), file, function (error, tree) {
                if (!cancelled) {
                    setError(error)
                    setTree(tree)
                }
            })

            /**
             * @returns {undefined}
             *   Nothing.
             */
            return function () {
                cancelled = true
            }
        },
        [options.children, processor]
    )

    if (error) throw error

    return tree ? post(tree, options) : options.fallback
}

/**
* Set up the `unified` processor.
*
* @param {Readonly<Options>} options
*   Props.
* @returns {Processor<MdastRoot, MdastRoot, Root, undefined, undefined>}
*   Result.
*/
function createProcessor(options) {
    const rehypePlugins = options.rehypePlugins || emptyPlugins
    const remarkPlugins = options.remarkPlugins || emptyPlugins
    const remarkRehypeOptions = options.remarkRehypeOptions
        ? { ...options.remarkRehypeOptions, ...emptyRemarkRehypeOptions }
        : emptyRemarkRehypeOptions

    const processor = unified()
        .use(remarkParse)
        .use(remarkPlugins)
        .use(remarkRehype, remarkRehypeOptions)
        .use(rehypePlugins)

    return processor
}

/**
* Set up the virtual file.
*
* @param {Readonly<Options>} options
*   Props.
* @returns {VFile}
*   Result.
*/
function createFile(options) {
    const children = options.children || ''
    const file = new VFile()

    if (typeof children === 'string') {
        file.value = children
    } else {
        unreachable(
            'Unexpected value `' +
            children +
            '` for `children` prop, expected `string`'
        )
    }

    return file
}

/**
* Process the result from unified some more.
*
* @param {Nodes} tree
*   Tree.
* @param {Readonly<Options>} options
*   Props.
* @returns {ReactElement}
*   React element.
*/
function post(tree, options) {
    const allowedElements = options.allowedElements
    const allowElement = options.allowElement
    const components = options.components
    const disallowedElements = options.disallowedElements
    const skipHtml = options.skipHtml
    const unwrapDisallowed = options.unwrapDisallowed
    const urlTransform = options.urlTransform || defaultUrlTransform

    for (const deprecation of deprecations) {
        if (Object.hasOwn(options, deprecation.from)) {
            unreachable(
                'Unexpected `' +
                deprecation.from +
                '` prop, ' +
                (deprecation.to
                    ? 'use `' + deprecation.to + '` instead'
                    : 'remove it') +
                ' (see <' +
                changelog +
                '#' +
                deprecation.id +
                '> for more info)'
            )
        }
    }

    if (allowedElements && disallowedElements) {
        unreachable(
            'Unexpected combined `allowedElements` and `disallowedElements`, expected one or the other'
        )
    }

    visit(tree, transform)

    return toJsxRuntime(tree, {
        Fragment,
        components,
        ignoreInvalidStyle: true,
        jsx,
        jsxs,
        passKeys: true,
        passNode: true
    })

    /** @type {BuildVisitor<Root>} */
    function transform(node, index, parent) {
        if (node.type === 'raw' && parent && typeof index === 'number') {
            if (skipHtml) {
                parent.children.splice(index, 1)
            } else {
                parent.children[index] = { type: 'text', value: node.value }
            }

            return index
        }

        if (node.type === 'element') {
            /** @type {string} */
            let key

            for (key in urlAttributes) {
                if (
                    Object.hasOwn(urlAttributes, key) &&
                    Object.hasOwn(node.properties, key)
                ) {
                    const value = node.properties[key]
                    const test = urlAttributes[key]
                    if (test === null || test.includes(node.tagName)) {
                        node.properties[key] = urlTransform(String(value || ''), key, node)
                    }
                }
            }
        }

        if (node.type === 'element') {
            let remove = allowedElements
                ? !allowedElements.includes(node.tagName)
                : disallowedElements
                    ? disallowedElements.includes(node.tagName)
                    : false

            if (!remove && allowElement && typeof index === 'number') {
                remove = !allowElement(node, index, parent)
            }

            if (remove && parent && typeof index === 'number') {
                if (unwrapDisallowed && node.children) {
                    parent.children.splice(index, 1, ...node.children)
                } else {
                    parent.children.splice(index, 1)
                }

                return index
            }
        }
    }
}

/**
* Make a URL safe.
*
* This follows how GitHub works.
* It allows the protocols `http`, `https`, `irc`, `ircs`, `mailto`, and `xmpp`,
* and URLs relative to the current protocol (such as `/something`).
*
* @satisfies {UrlTransform}
* @param {string} value
*   URL.
* @returns {string}
*   Safe URL.
*/
export function defaultUrlTransform(value) {
    // Same as:
    // <https://github.com/micromark/micromark/blob/929275e/packages/micromark-util-sanitize-uri/dev/index.js#L34>
    // But without the `encode` part.
    const colon = value.indexOf(':')
    const questionMark = value.indexOf('?')
    const numberSign = value.indexOf('#')
    const slash = value.indexOf('/')

    if (
        // If there is no protocol, it’s relative.
        colon === -1 ||
        // If the first colon is after a `?`, `#`, or `/`, it’s not a protocol.
        (slash !== -1 && colon > slash) ||
        (questionMark !== -1 && colon > questionMark) ||
        (numberSign !== -1 && colon > numberSign) ||
        // It is a protocol, it should be allowed.
        safeProtocol.test(value.slice(0, colon))
    ) {
        return value
    }

    return ''
}