import { VerticalHubContent, makeVerticalMetadata } from "@/components/seo/VerticalHubContent"

export const revalidate = 21600

export const metadata = makeVerticalMetadata("friseur")

export default function Page() {
  return <VerticalHubContent verticalSlug="friseur" />
}
