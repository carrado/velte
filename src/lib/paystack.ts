interface OpenPaystackOpts {
  url: string;
  onClose: () => void;
}

export function openPaystackPopup({
  url,
  onClose,
}: OpenPaystackOpts): Window | null {
  const w = 480;
  const h = 720;
  const left = Math.max(0, (window.screen.width - w) / 2);
  const top = Math.max(0, (window.screen.height - h) / 2);
  const popup = window.open(
    url,
    "paystack-popup",
    `width=${w},height=${h},top=${top},left=${left}`,
  );
  if (!popup) return null;
  const timer = setInterval(() => {
    if (popup.closed) {
      clearInterval(timer);
      onClose();
    }
  }, 500);
  return popup;
}
