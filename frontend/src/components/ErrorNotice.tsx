import { AlertIcon } from './icons';

type ErrorNoticeProps = {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
};

export function ErrorNotice({ title, message, actionLabel, onAction }: ErrorNoticeProps) {
  return (
    <div className="error-notice">
      <AlertIcon />
      <div className="error-notice__content">
        <p className="error-notice__title">{title}</p>
        <p className="error-notice__message">{message}</p>
      </div>
      <button
        type="button"
        className="button button--secondary error-notice__action"
        onClick={onAction}
      >
        {actionLabel}
      </button>
    </div>
  );
}
