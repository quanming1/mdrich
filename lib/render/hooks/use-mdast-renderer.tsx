import React, { useMemo, useCallback, useState } from "react";
import * as MDAST from "../types/mdast";
import * as Renderer from "../types/renderer";
import { renderMDAST } from "../core/renderer";
import { defaultConfig } from "../components/defaults";

/**
 * Hook for rendering MDAST trees with configurable renderers
 */
export const useMDASTRenderer = (
  initialConfig: Renderer.RendererConfig = defaultConfig,
): Renderer.UseRendererResult => {
  const [config, setConfig] = useState<Renderer.RendererConfig>(initialConfig);

  // 合并配置，确保始终有默认值
  const mergedConfig = useMemo(
    () => ({
      ...defaultConfig,
      ...config,
      renderers: {
        ...defaultConfig.renderers,
        ...config.renderers,
      },
    }),
    [config],
  );

  // 渲染函数
  const render = useCallback(
    (tree: MDAST.Root): React.ReactElement => {
      return renderMDAST(tree, mergedConfig);
    },
    [mergedConfig],
  );

  // 更新配置函数
  const updateConfig = useCallback((newConfig: Partial<Renderer.RendererConfig>) => {
    setConfig((prevConfig) => ({
      ...prevConfig,
      ...newConfig,
      renderers: {
        ...prevConfig.renderers,
        ...newConfig.renderers,
      },
    }));
  }, []);

  return {
    render,
    config: mergedConfig,
    updateConfig,
  };
};

/**
 * Hook for creating a custom renderer configuration
 */
export const useRendererConfig = (
  customRenderers?: Partial<Renderer.Renderers>,
  options?: Omit<Renderer.RendererConfig, "renderers">,
): Renderer.RendererConfig => {
  return useMemo(
    () => ({
      ...defaultConfig,
      ...options,
      renderers: {
        ...defaultConfig.renderers,
        ...customRenderers,
      },
    }),
    [customRenderers, options],
  );
};

/**
 * Hook for accessing renderer context
 */
export { useRendererContext } from "../core/renderer";

/**
 * Hook for creating a memoized renderer
 */
export const useMemoizedRenderer = (
  tree: MDAST.Root,
  config?: Renderer.RendererConfig,
  deps: React.DependencyList = [],
): React.ReactElement => {
  return useMemo(() => {
    return renderMDAST(tree, config);
  }, [tree, config, ...deps]);
};

/**
 * Hook for creating a renderer with custom components
 */
export const useCustomRenderer = (customComponents: Partial<Renderer.Renderers>) => {
  const config = useRendererConfig(customComponents);
  return useMDASTRenderer(config);
};

/**
 * Hook for creating a safe renderer (no HTML)
 */
export const useSafeRenderer = () => {
  const config = useRendererConfig({}, { allowDangerousHtml: false });
  return useMDASTRenderer(config);
};

/**
 * Hook for creating a full-featured renderer (with HTML)
 */
export const useFullRenderer = () => {
  const config = useRendererConfig({}, { allowDangerousHtml: true });
  return useMDASTRenderer(config);
};

/**
 * Higher-order component for providing renderer context
 */
export const withRenderer = <P extends object>(
  Component: React.ComponentType<P>,
  rendererConfig?: Renderer.RendererConfig,
) => {
  return React.forwardRef<any, P>((props, ref) => {
    const { render } = useMDASTRenderer(rendererConfig);

    return <Component {...props} ref={ref} render={render} />;
  });
};

/**
 * Component for rendering MDAST trees directly
 */
export const MDRenderer: React.FC<{
  tree: MDAST.Root;
  config?: Renderer.RendererConfig;
  className?: string;
  style?: React.CSSProperties;
}> = ({ tree, config, className, style }) => {
  const finalConfig = useMemo(
    () => ({
      ...config,
      className: className || config?.className,
      style: style || config?.style,
    }),
    [config, className, style],
  );

  return useMemoizedRenderer(tree, finalConfig, [tree, finalConfig]);
};

/**
 * Hook for debugging MDAST trees
 */
export const useMDASTDebug = (tree: MDAST.Root) => {
  const debugInfo = useMemo(() => {
    const nodeCount = (node: MDAST.Node): number => {
      if ("children" in node && Array.isArray(node.children)) {
        return 1 + node.children.reduce((sum, child) => sum + nodeCount(child), 0);
      }
      return 1;
    };

    const nodeTypes = new Set<string>();
    const walkNodes = (node: MDAST.Node) => {
      nodeTypes.add(node.type);
      if ("children" in node && Array.isArray(node.children)) {
        node.children.forEach(walkNodes);
      }
    };

    walkNodes(tree);

    return {
      totalNodes: nodeCount(tree),
      nodeTypes: Array.from(nodeTypes),
      tree,
    };
  }, [tree]);

  const logDebugInfo = useCallback(() => {
    console.group("MDAST Debug Info");
    console.log("Total nodes:", debugInfo.totalNodes);
    console.log("Node types:", debugInfo.nodeTypes);
    console.log("Tree:", debugInfo.tree);
    console.groupEnd();
  }, [debugInfo]);

  return {
    ...debugInfo,
    logDebugInfo,
  };
};
