export class InputHandler {
  private _handler: (e: KeyboardEvent) => void;

  constructor(
    onChar: (char: string) => void,
    onPause: () => void,
    onResume: () => void,
    onSetTime: () => void,
  ) {
    this._handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        onPause();
        return;
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        onResume();
        return;
      }
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        onSetTime();
        return;
      }
      if (!e.ctrlKey && !e.altKey && !e.metaKey && /^[a-zA-Z]$/.test(e.key)) {
        onChar(e.key.toLowerCase());
      }
    };
    window.addEventListener('keydown', this._handler);
  }

  destroy(): void {
    window.removeEventListener('keydown', this._handler);
  }
}
