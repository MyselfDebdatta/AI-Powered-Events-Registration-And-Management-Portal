/**
 * TicketStub — the perforated lower stub of the pass (§7.4): scope on the
 * left, where it was issued on the right. The pass ID itself lives on the
 * card so it is readable without scanning.
 */
export function TicketStub({ scope = 'Entry · sessions', issuedAt = 'Arrival desk' }) {
  return (
    <div className="flex items-center justify-between px-[18px] pb-3.5 pt-2.5">
      <div>
        <div className="text-[7.5px] font-bold uppercase tracking-[0.14em] text-ivory-100/56">
          Scope
        </div>
        <div className="mt-0.5 text-[10.5px] font-semibold text-ivory-100">{scope}</div>
      </div>
      <div className="text-right">
        <div className="text-[7.5px] font-bold uppercase tracking-[0.14em] text-ivory-100/56">
          Issued at
        </div>
        <div className="mt-0.5 text-[10.5px] font-semibold text-gold-500">{issuedAt}</div>
      </div>
    </div>
  )
}

export default TicketStub
