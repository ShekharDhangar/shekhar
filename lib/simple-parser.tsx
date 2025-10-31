import React from "react"

// Simple component registry
const components: Record<string, React.ComponentType<any>> = {}

export function registerComponent(name: string, component: React.ComponentType<any>) {
  components[name] = component
}

// Parse text and convert component tags to React components
export function parseText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let keyCounter = 0

  // Split text into lines and process each non-empty line as a block
  const lines = text.split(/\r?\n/)
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine === '') {
      // Skip empty lines - use <margin> component for spacing instead
      continue
    }
    
    // Parse each line as a block
    const parsed = parseBlock(trimmedLine)
    
    if (parsed.length > 0) {
      // Process items (handle Heading1 block display)
      const processed = parsed.map((item, idx) => {
        if (React.isValidElement(item) && item.type && typeof item.type === 'function') {
          const componentName = item.type.name
          // Handle Heading1 - add block class if it's the root element
          if (componentName === 'Heading1' && idx === 0 && parsed.length === 1) {
            return React.cloneElement(item, { 
              key: `block-${keyCounter++}-${idx}`,
              className: `${item.props.className || ''} block`.trim()
            })
          }
        }
        return React.isValidElement(item)
          ? React.cloneElement(item, { key: `block-${keyCounter++}-${idx}` })
          : item
      })
      
      parts.push(...processed)
    }
  }

  return parts
}

function parseBlock(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let currentIndex = 0
  let textBuffer = ""
  let keyCounter = 0

  const processText = (text: string): React.ReactNode[] => {
    if (!text.trim()) return []
    
    // Process markdown links
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    let lastIndex = 0
    const linkParts: React.ReactNode[] = []

    linkRegex.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before link
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index)
        if (beforeText) linkParts.push(beforeText)
      }
      // Add link
      linkParts.push(
        <a
          key={`link-${keyCounter++}`}
          href={match[2]}
          className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
          target={match[2].startsWith('http') ? '_blank' : undefined}
          rel={match[2].startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {match[1]}
        </a>
      )
      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex)
      if (remainingText) linkParts.push(remainingText)
    }

    return linkParts.length > 0 ? linkParts : text ? [text] : []
  }

  const flushText = () => {
    if (textBuffer.trim()) {
      const processed = processText(textBuffer)
      if (processed.length > 0) {
        parts.push(...processed)
      }
      textBuffer = ""
    }
  }

  while (currentIndex < text.length) {
    // Look for opening tag <componentName (supports self-closing tags)
    const remainingText = text.slice(currentIndex)
    const openTagMatch = remainingText.match(/^<(\w+)([^>]*?)(\/?)>/)
    
    if (openTagMatch) {
      flushText()
      
      const componentName = openTagMatch[1]
      const attrsString = openTagMatch[2]
      const isSelfClosing = openTagMatch[3] === '/'
      const fullOpenTag = openTagMatch[0]
      const tagLength = fullOpenTag.length

      // Parse attributes
      const attrs: Record<string, string> = {}
      const attrRegex = /(\w+)="([^"]+)"/g
      let attrMatch: RegExpExecArray | null
      
      while ((attrMatch = attrRegex.exec(attrsString)) !== null) {
        attrs[attrMatch[1]] = attrMatch[2]
      }
      
      if (isSelfClosing) {
        // Self-closing tag - no content, no closing tag needed
        const Component = components[componentName]
        if (Component) {
          parts.push(
            <Component key={`${componentName}-${keyCounter++}`} {...attrs} />
          )
        } else {
          // Component not found, treat as text
          textBuffer += text.slice(currentIndex, currentIndex + tagLength)
        }
        currentIndex += tagLength
        continue
      }

      // Find matching closing tag
      const closingTag = `</${componentName}>`
      let depth = 1
      let searchIndex = currentIndex + tagLength
      let closeIndex = -1

      // Handle nested tags of same type
      while (searchIndex < text.length && depth > 0) {
        const nextOpen = text.indexOf(`<${componentName}`, searchIndex)
        const nextClose = text.indexOf(closingTag, searchIndex)
        
        if (nextClose === -1) {
          // No closing tag found
          break
        }

        if (nextOpen !== -1 && nextOpen < nextClose) {
          // Found nested opening tag
          depth++
          searchIndex = nextOpen + tagLength
        } else {
          // Found closing tag
          depth--
          if (depth === 0) {
            closeIndex = nextClose
            break
          }
          searchIndex = nextClose + closingTag.length
        }
      }

      if (closeIndex === -1) {
        // No closing tag found, treat as text
        textBuffer += text.slice(currentIndex, currentIndex + tagLength)
        currentIndex += tagLength
        continue
      }

      // Get content between tags
      const content = text.slice(currentIndex + tagLength, closeIndex)
      const Component = components[componentName]

      if (Component) {
        // Recursively parse nested content
        const parsedContent = parseBlock(content)
        parts.push(
          <Component key={`${componentName}-${keyCounter++}`} {...attrs}>
            {parsedContent}
          </Component>
        )
      } else {
        // Component not found, treat as text
        textBuffer += text.slice(currentIndex, closeIndex + closingTag.length)
      }

      currentIndex = closeIndex + closingTag.length
    } else {
      // Regular text
      textBuffer += text[currentIndex]
      currentIndex++
    }
  }

  flushText()

  return parts
}
