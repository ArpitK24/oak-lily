// Reveal an alternate only after it has decoded successfully. The primary stays
// underneath, so a missing or unsupported secondary image never leaves a gap.
document.querySelectorAll('.oak-arrivals__alternate').forEach(image => {
  const ready = async () => {
    try {
      await image.decode();
      if (image.naturalWidth > 0) image.classList.add('is-ready');
    } catch {
      image.remove();
    }
  };
  image.addEventListener('load', ready, { once: true });
  image.addEventListener('error', () => image.remove(), { once: true });
  if (image.complete) ready();
});
