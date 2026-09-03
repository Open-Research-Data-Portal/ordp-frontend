export function StepMenuBoxes({ steps, currentStep, allComplete = false, onStepClick }) {
  return (
    <div className="mt-8 pt-6 border-t border-[#E3E1DA]">
      <p className="text-xs font-semibold text-gray-400 text-center uppercase tracking-wider mb-3">
        Quick Step Navigation
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isComplete = allComplete || stepNumber < currentStep;
          const isActive = !allComplete && stepNumber === currentStep;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onStepClick?.(stepNumber)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs border cursor-pointer ${
                isActive
                  ? "bg-navy text-gold border-gold/50 shadow-md ring-2 ring-gold/20 scale-[1.02]"
                  : isComplete
                    ? "bg-white text-navy border-emerald-300 hover:bg-slate-50 hover:border-navy"
                    : "bg-white text-slate-500 border-slate-200 hover:text-navy hover:border-slate-300"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive
                    ? "bg-gold text-navy"
                    : isComplete
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {isComplete ? "✓" : stepNumber}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function StepIndicator({ steps, currentStep, allComplete = false, onStepClick }) {
  return (
    <ol className="flex justify-center items-start py-8 list-none m-0">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isComplete = allComplete || stepNumber < currentStep;
        const isActive = !allComplete && stepNumber === currentStep;
        return (
          <li key={label} className="flex items-center relative">
            <button
              type="button"
              onClick={() => onStepClick?.(stepNumber)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-semibold
                transition-all duration-300 ease-out cursor-pointer border-0
                ${isComplete || isActive ? "bg-navy text-white scale-100" : "bg-[#E3E1DA] text-gray-500 scale-95"}`}
            >
              {isComplete ? "✓" : stepNumber}
            </button>
            <span
              className={`absolute top-12 left-1/2 -translate-x-1/2 text-sm whitespace-nowrap transition-colors duration-300
                ${isActive ? "text-navy font-semibold" : "text-gray-500"}`}
            >
              {label}
            </span>
            {stepNumber < steps.length && (
              <div className={`w-[70px] sm:w-[110px] md:w-[130px] h-0.5 mx-2 transition-colors duration-500 ${isComplete ? "bg-navy" : "bg-[#E3E1DA]"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}