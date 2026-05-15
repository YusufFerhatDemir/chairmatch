import { VerticalHubContent, makeVerticalMetadata } from "@/components/seo/VerticalHubContent"

export const revalidate = 21600

export const metadata = makeVerticalMetadata("lash-brows")

export default function Page() {
  return <VerticalHubContent verticalSlug="lash-brows" />
}
