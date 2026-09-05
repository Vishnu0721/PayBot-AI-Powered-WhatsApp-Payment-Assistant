export default function ProductVisual() {
  return (
    <div className="float-visual mx-auto w-full max-w-[380px] overflow-hidden rounded-2xl border border-white/60 bg-[#ECE5DD] shadow-[0_24px_60px_rgba(16,24,16,0.12)]">
      <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3 text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[11px] font-semibold">
          PB
        </span>
        <div>
          <p className="text-[13px] font-medium leading-none">PayBot</p>
          <p className="mt-1 text-[11px] text-white/65">online</p>
        </div>
      </div>

      <div className="space-y-3 px-4 py-5">
        <Bubble side="right" time="10:42">
          Hi Rahul, your grocery order is ₹500.
        </Bubble>
        <Bubble side="left" time="10:42" label="PayBot">
          Payment request created.
        </Bubble>
        <Bubble side="left" time="10:43">
          <span className="inline-flex rounded-md bg-forest px-3 py-1.5 text-[12px] font-medium text-white">
            Pay ₹500
          </span>
        </Bubble>
        <div className="mx-auto max-w-[230px] rounded-xl bg-white px-4 py-3 text-center shadow-sm">
          <p className="text-[13px] font-medium text-emerald">✓ Payment successful</p>
          <p className="mt-1 text-[18px] font-semibold tracking-tight">₹500 received</p>
        </div>
      </div>
    </div>
  );
}

function Bubble({ children, side, time, label }) {
  const mine = side === 'right';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] rounded-xl px-3 py-2 text-[13px] leading-relaxed shadow-sm ${
          mine ? 'rounded-tr-sm bg-[#D9FDD3] text-[#111B21]' : 'rounded-tl-sm bg-white text-[#111B21]'
        }`}
      >
        {label && <p className="mb-1 text-[10px] font-semibold text-forest">{label}</p>}
        {children}
        <div className="mt-1 text-right text-[10px] text-[#667781]">{time}</div>
      </div>
    </div>
  );
}
