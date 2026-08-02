import Header from "../components/Header";
import Footer from "../components/Footer";
import StepIndicator from "../components/StepIndicator";

export default function ContributeLayout({ steps, currentStep, allComplete, children }) {
  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main className="flex-1 max-w-6xl w-full mx-auto px-8 pb-16">
        <StepIndicator steps={steps} currentStep={currentStep} allComplete={allComplete} />
        <div className="pb-6">{children}</div>
      </main>
      <Footer />
    </div>
  );
}