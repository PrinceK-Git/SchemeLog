import { Button, StatePanel } from '../components/UI';
import Icon from '../components/Icon';

export default function NotFound() {
  return (
    <div className="container page">
      <span className="eyebrow">A small detour</span>
      <h1>We couldn’t find that page.</h1>
      <StatePanel
        title="Let’s find your way back."
        icon="pin"
        action={
          <Button to="/">
            Back to home <Icon name="arrow" />
          </Button>
        }
      >
        <p>The address may be incorrect. Your answers are still available during this session.</p>
      </StatePanel>
    </div>
  );
}
