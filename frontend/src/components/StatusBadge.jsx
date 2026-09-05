const styles = {
  PENDING: 'bg-[#F4EDE1] text-[#8A5A12]',
  PAID: 'bg-[#E5F4EC] text-[#0E7A57]',
  FAILED: 'bg-[#F8E6E4] text-[#B42318]',
  EXPIRED: 'bg-[#EEECE7] text-[#6B675F]',
  CANCELLED: 'bg-[#EEECE7] text-[#6B675F]',
};

export default function StatusBadge({ status }) {
  const key = String(status || 'PENDING').toUpperCase();
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wide ${styles[key] || styles.PENDING}`}
    >
      {key}
    </span>
  );
}
