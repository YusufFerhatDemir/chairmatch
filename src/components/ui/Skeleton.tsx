interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8 }: SkeletonProps) {
  return <div className="skel" style={{ width, height, borderRadius }} />
}
