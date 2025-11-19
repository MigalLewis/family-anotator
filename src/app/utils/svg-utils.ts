/**
 * Utilities for preparing SVG elements before exporting.
 */
export function cleanSVG(svgEl: SVGElement): SVGElement {
  const cloned = svgEl.cloneNode(true) as SVGElement;

  // REMOVE Angular comment nodes
  const walker = document.createTreeWalker(cloned, NodeFilter.SHOW_COMMENT);
  const comments: Comment[] = [];

  let node = walker.nextNode();
  while (node) {
    comments.push(node as Comment);
    node = walker.nextNode();
  }

  comments.forEach(c => c.parentNode?.removeChild(c));

  return cloned;
}

export function fixSvgPercentUnits(
  svgEl: SVGElement,
  imgWidth: number,
  imgHeight: number
): SVGElement {
  const clone = svgEl.cloneNode(true) as SVGElement;

  // convert % → absolute px for lines, circles, text
  const elements = Array.from(clone.querySelectorAll('line, circle, text')) as SVGElement[];

  elements.forEach((el) => {
    const setAttr = (attr: string, dimension: number) => {
      const value = el.getAttribute(attr);
      if (value !== null) {
        el.setAttribute(attr, ((parseFloat(value) / 100) * dimension).toString());
      }
    };

    setAttr('x1', imgWidth);
    setAttr('y1', imgHeight);
    setAttr('x2', imgWidth);
    setAttr('y2', imgHeight);
    setAttr('cx', imgWidth);
    setAttr('cy', imgHeight);
    setAttr('x', imgWidth);
    setAttr('y', imgHeight);

    const rValue = el.getAttribute('r');
    if (rValue !== null) {
      el.setAttribute('r', ((parseFloat(rValue) / 100) * imgWidth).toString());
    }
  });

  return clone;
}

