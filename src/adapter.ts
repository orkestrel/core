import { Lifecycle } from './lifecycle.js'

/**
 * Base class for adapters that need lifecycle management.
 * Subclasses override onCreate/onStart/onStop/onDestroy as needed.
 */
export abstract class Adapter extends Lifecycle {
	// Optional convenience overrides; subclasses implement what they need.
	protected async onCreate(): Promise<void> {}
	protected async onStart(): Promise<void> {}
	protected async onStop(): Promise<void> {}
	protected async onDestroy(): Promise<void> {}
}
