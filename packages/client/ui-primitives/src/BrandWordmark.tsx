import type { IconProps } from './icons/props.ts'
import { FishLogo } from './FishLogo.tsx'

/** Display options for the PureGamma Harness wordmark. */
export interface BrandWordmarkProps extends IconProps {
  /** Whether to include the leading swallow mark. */
  includeMark?: boolean | undefined
}

/**
 * Render the PureGamma Harness name with an optional mark.
 * @param props.size - Wordmark height in pixels.
 * @param props.className - Extra layout class.
 * @param props.includeMark - Whether to include the swallow.
 * @returns the PureGamma Harness wordmark.
 */
export function BrandWordmark({ size = 24, className, includeMark = true }: BrandWordmarkProps) {
  const width = includeMark ? 182 : 156
  return (
    <svg width={(size * width) / 24} height={size} className={className}
      viewBox={includeMark ? '0 0 182 24' : '26 0 156 24'} aria-label="PureGamma Harness" role="img">
      {includeMark && <FishLogo size={24} />}
      <text x="26" y="18" fill="currentColor" fontFamily="Montserrat, system-ui, sans-serif"
        fontWeight="600" fontSize="21" textLength="150" lengthAdjust="spacingAndGlyphs" letterSpacing="-.5">PureGamma Harness</text>
    </svg>
  )
}
