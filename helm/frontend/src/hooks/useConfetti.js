export function triggerConfetti() {
  const container = document.getElementById('confetti-container');
  if (!container) return;
  const colors = ['#d4a853', '#2dd4a0', '#4a9eff', '#f25f5c', '#8b5cf6', '#f5a623', '#e8c17a', '#ffffff'];
  for (let i = 0; i < 50; i++) {
    const piece = document.createElement('div');
    piece.style.cssText = `
      position: absolute;
      width: ${6 + Math.random() * 6}px;
      height: ${6 + Math.random() * 6}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${Math.random() * 100}%;
      top: -20px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation: confetti-fall ${1 + Math.random() * 1.5}s ease-in forwards;
      animation-delay: ${Math.random() * 0.6}s;
      pointer-events: none;
    `;
    container.appendChild(piece);
  }
  setTimeout(() => { container.innerHTML = ''; }, 3000);
}
