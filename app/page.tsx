import { readFileSync } from "fs"
import { join } from "path"
import { parseText, registerComponent } from "@/lib/simple-parser"
import { Heading1 } from "@/components/ui/heading1"
import { SmallText } from "@/components/ui/small-text"
import { Margin } from "@/components/ui/margin"
import { Link } from "@/components/ui/link"
import { HomeContent } from "@/components/home-content"

// Register components
registerComponent("heading1", Heading1)
registerComponent("smallText", SmallText)
registerComponent("margin", Margin)
registerComponent("link", Link)

function getContent() {
  const filePath = join(process.cwd(), "content", "home.txt")
  return readFileSync(filePath, "utf8")
}

export default function Home() {
  const content = getContent()
  const parsedContent = parseText(content)

  return (
    <main className="min-h-screen bg-transparent font-sans relative">
      <div className="mx-auto px-6 sm:px-12 pt-40 pb-12 max-w-4xl relative z-100">
        <HomeContent>
          <div id="content-boundary" className="inline-block p-2">
            {parsedContent}
          </div>
        </HomeContent>
      </div>
    </main>
  )
}
