/** Page dim behind a modal.
 *  A modal opened on its own blurs the page. A modal opened on top of
 *  another is only a light dark veil, full viewport, so the blurs do not stack. */
export function modalScrimClass(stacked = false) {
  return stacked ? "bg-black/30" : "bg-black/40 backdrop-blur-md";
}
