import StatusBadge from './StatusBadge.jsx';

const rows = [
  { name: 'Rahul', item: 'Groceries', amount: '₹500', status: 'PAID' },
  { name: 'Anjali', item: 'Birthday cake', amount: '₹800', status: 'PENDING' },
  { name: 'Priya', item: 'Monthly tuition', amount: '₹1,500', status: 'PAID' },
];

export default function DashboardShowcase() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_20px_50px_rgba(16,24,16,0.06)]">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <p className="text-[13px] font-medium">Collections</p>
          <p className="text-[12px] text-muted">Today</p>
        </div>
        <span className="text-[11px] font-semibold text-emerald">Live</span>
      </div>

      <div className="grid gap-px bg-line sm:grid-cols-3">
        <Stat label="Total collected" value="₹2,800" />
        <Stat label="Pending payments" value="1" />
        <Stat label="Successful payments" value="2" />
      </div>

      <div className="px-5 py-4">
        <p className="text-[12px] font-medium text-muted">Recent transactions</p>
        <div className="mt-3 divide-y divide-line">
          {rows.map((row) => (
            <div key={row.name} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{row.name}</p>
                <p className="text-[12px] text-muted">{row.item}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium">{row.amount}</p>
                <StatusBadge status={row.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-paper px-5 py-5">
      <p className="text-[12px] text-muted">{label}</p>
      <p className="mt-2 text-[26px] font-semibold tracking-tight">{value}</p>
    </div>
  );
}
