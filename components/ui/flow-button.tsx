import { ArrowRight } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

export function FlowButton({ text = 'Try again', className = '', ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { text?: string }) {
  return <button {...props} type="button" className={`flow-button ${className}`}>
    <ArrowRight className="flow-arrow flow-arrow-in" aria-hidden="true" />
    <span className="flow-label">{text}</span>
    <span className="flow-circle" aria-hidden="true" />
    <ArrowRight className="flow-arrow flow-arrow-out" aria-hidden="true" />
  </button>;
}
