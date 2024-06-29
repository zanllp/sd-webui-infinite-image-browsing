
export const closeImageFullscreenPreview = () => {
  const ele = Array.from(document.querySelectorAll('.ant-image-preview-wrap') as unknown as HTMLDivElement[])
    .find(e => e.style.display !== 'none');
  if (ele) {
    console.log('closeImageFullscreenPreview success');
    simulateClick(ele);
  } else {
    console.log('closeImageFullscreenPreview not found');
  }
};

function simulateClick(element: HTMLElement) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('The provided value is not an HTMLElement.');
  }

  const event = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true,
    target: element, // Although setting target here has no effect as it's a read-only property
  } as any);

  element.dispatchEvent(event);
}


export const openImageFullscreenPreview = (idx: number, root: HTMLElement) => {
  const el = root.querySelector(`.idx-${idx} .ant-image-img`) as HTMLImageElement | null
  if (el) {
    el.click()
  } else {
    console.log('openImageFullscreenPreview error: not found', idx, root);
  }
}
