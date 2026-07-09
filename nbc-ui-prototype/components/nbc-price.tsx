import { cnyToNbc, formatCny, formatNbc } from "@/lib/data"

export function NbcPrice({
  cny,
  size = "md",
  className = "",
}: {
  cny: number
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const nbc = cnyToNbc(cny)
  const sizes = {
    sm: { nbc: "text-base", cny: "text-xs" },
    md: { nbc: "text-xl", cny: "text-sm" },
    lg: { nbc: "text-3xl", cny: "text-base" },
  }[size]

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-baseline gap-1.5 font-mono">
        <span className={`font-semibold text-primary ${sizes.nbc}`}>{formatNbc(nbc)}</span>
        <span className="text-xs font-medium tracking-wider text-primary/70">NBC</span>
      </div>
      <span className={`text-muted-foreground ${sizes.cny}`}>≈ ¥{formatCny(cny)}</span>
    </div>
  )
}
