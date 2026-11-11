import { MinusIcon, PlusIcon } from './icons';

type QuantityStepperProps = {
  productName: string;
  quantity: number;
  maximum: number;
  onDecrease: () => void;
  onIncrease: () => void;
};

export function QuantityStepper({
  productName,
  quantity,
  maximum,
  onDecrease,
  onIncrease,
}: QuantityStepperProps) {
  const canDecrease = quantity > 1;
  const canIncrease = quantity < maximum;

  return (
    <div className="stepper" role="group" aria-label={`${productName} quantity`}>
      <button
        type="button"
        className="stepper__button"
        aria-label={`Decrease ${productName} quantity`}
        aria-disabled={!canDecrease}
        onClick={() => {
          if (canDecrease) {
            onDecrease();
          }
        }}
      >
        <MinusIcon />
      </button>
      <span className="stepper__value">{quantity}</span>
      <button
        type="button"
        className="stepper__button"
        aria-label={`Increase ${productName} quantity`}
        aria-disabled={!canIncrease}
        onClick={() => {
          if (canIncrease) {
            onIncrease();
          }
        }}
      >
        <PlusIcon />
      </button>
    </div>
  );
}
