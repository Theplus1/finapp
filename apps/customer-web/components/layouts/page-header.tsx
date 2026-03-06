import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col gap-2 pb-2", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
PageHeader.displayName = "PageHeader"

interface PageTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

const PageTitle = React.forwardRef<HTMLHeadingElement, PageTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h1
        ref={ref}
        className={cn(
          "text-xl font-semibold tracking-tight",
          className
        )}
        {...props}
      >
        {children}
      </h1>
    )
  }
)
PageTitle.displayName = "PageTitle"

interface PageDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

const PageDescription = React.forwardRef<HTMLParagraphElement, PageDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn("text-muted-foreground text-base", className)}
        {...props}
      >
        {children}
      </p>
    )
  }
)
PageDescription.displayName = "PageDescription"

interface PageActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const PageActions = React.forwardRef<HTMLDivElement, PageActionsProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-2", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
PageActions.displayName = "PageActions"

export { PageHeader, PageTitle, PageDescription, PageActions }
