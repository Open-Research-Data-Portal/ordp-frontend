export default function StepIndicator({ steps, currentStep, allComplete = false }) {
  return (
    <ol className="flex justify-center items-start py-10 list-none m-0">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isComplete = allComplete || stepNumber < currentStep;
        const isActive = !allComplete && stepNumber === currentStep;
        return (
          <li key={label} className="flex items-center relative">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-semibold
                transition-all duration-300 ease-out
                ${isComplete || isActive ? "bg-navy text-white scale-100" : "bg-[#E3E1DA] text-gray-500 scale-95"}`}
            >
              {isComplete ? "✓" : stepNumber}
            </div>
            <span
              className={`absolute top-12 left-1/2 -translate-x-1/2 text-sm whitespace-nowrap transition-colors duration-300
                ${isActive ? "text-navy font-semibold" : "text-gray-500"}`}
            >
              {label}
            </span>
            {stepNumber < steps.length && (
              <div className={`w-[130px] h-0.5 mx-2 transition-colors duration-500 ${isComplete ? "bg-navy" : "bg-[#E3E1DA]"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}