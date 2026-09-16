import React from 'react';
import { OnboardingView } from '../views/OnboardingView';

interface OnboardingFlowProps {
  onComplete?: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = () => {
  return <OnboardingView />;
};

