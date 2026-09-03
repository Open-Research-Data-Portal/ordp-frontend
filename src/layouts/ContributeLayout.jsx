import TopBar from "./TopBar";
import Footer from "../components/Footer";
import StepIndicator, { StepMenuBoxes } from "../components/StepIndicator";

export default function ContributeLayout({ steps, currentStep, allComplete, onStepClick, children }) {
  return (
    <div
      className="flex flex-col min-h-screen bg-bg"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      <TopBar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 pb-16">
        <StepIndicator steps={steps} currentStep={currentStep} allComplete={allComplete} onStepClick={onStepClick} />
        <div className="pb-4">{children}</div>
        {steps && (
          <StepMenuBoxes
            steps={steps}
            currentStep={currentStep}
            allComplete={allComplete}
            onStepClick={onStepClick}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}