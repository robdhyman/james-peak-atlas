export function App() {
  return (
    <div className="flex h-full flex-col">
      <Topbar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          aria-label="Map controls"
          className="flex w-[326px] flex-none flex-col border-r border-line-strong bg-paper max-tablet:hidden max-desktop:w-[296px] wide:w-[346px]"
        >
          <div className="px-[23px] pt-6 pb-[19px] max-desktop:px-[19px] wide:px-7">
            <div className="text-[10px] font-bold tracking-[.11em] text-muted">JAMES PEAK WILDERNESS</div>
            <p className="mt-1.5 mb-[11px] text-[17px] font-semibold tracking-[-.03em]">
              Find the next place worth a walk.
            </p>
          </div>
        </aside>
        <main aria-label="Interactive scouting map" className="relative min-w-0 flex-1 bg-map" />
      </div>
    </div>
  )
}

function Topbar() {
  return (
    <header className="relative z-[1100] flex h-[86px] flex-none items-center gap-6 bg-ink px-7 text-topbar-text max-desktop:gap-4 max-desktop:px-5 max-tablet:h-[72px] max-tablet:gap-[11px] max-tablet:px-[15px]">
      <div className="flex flex-none items-center gap-[13px]">
        <svg
          viewBox="0 0 40 34"
          aria-hidden="true"
          className="h-[39px] w-[42px] fill-none stroke-brand-mark stroke-[1.3] [stroke-linecap:round] [stroke-linejoin:round] max-tablet:hidden"
        >
          <path d="m2 29 13-23 8 13 5-8 10 18H2Z" />
          <path d="m10 15 5 4 4-5M23 19l5 4 4-4" />
        </svg>
        <div>
          <span className="text-[9px] font-bold tracking-[.19em] text-topbar-eyebrow">FIELD ATLAS / COLORADO</span>
          <h1 className="mt-0.5 font-display text-[30px] leading-[1.1] font-normal tracking-[-.025em] max-tablet:text-[25px]">
            James Peak
          </h1>
        </div>
      </div>
      <div className="ml-auto flex flex-col items-end gap-1.5">
        <span className="flex items-center gap-[7px] text-[10px] font-bold tracking-[.12em] text-scenario max-tablet:text-[8px] max-tablet:tracking-[.05em]">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-dot" />
          LOW WATER · 2027
        </span>
        <span className="text-[11px] text-topbar-muted max-desktop:hidden">Occupancy assumed for planning</span>
      </div>
    </header>
  )
}
