import * as React from "react"
import { cn } from "@/lib/utils"

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn("space-y-4", className)}
        {...props}
      >
        {children}
      </section>
    )
  }
)
Section.displayName = "Section"

interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-between", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SectionHeader.displayName = "SectionHeader"

interface SectionTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

const SectionTitle = React.forwardRef<HTMLHeadingElement, SectionTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h2
        ref={ref}
        className={cn("text-xl font-semibold tracking-tight", className)}
        {...props}
      >
        {children}
      </h2>
    )
  }
)
SectionTitle.displayName = "SectionTitle"

interface SectionDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

const SectionDescription = React.forwardRef<HTMLParagraphElement, SectionDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
      >
        {children}
      </p>
    )
  }
)
SectionDescription.displayName = "SectionDescription"

interface SectionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const SectionContent = React.forwardRef<HTMLDivElement, SectionContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SectionContent.displayName = "SectionContent"

export {
  Section,
  SectionHeader,
  SectionTitle,
  SectionDescription,
  SectionContent,
}
