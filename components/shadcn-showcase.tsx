import * as React from "react"

import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"

export function ShadcnShowcase() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Shadcn UI Components</h1>
      
      {/* Button Showcase */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Buttons</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="default">Default</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      </section>
      
      {/* Input Showcase */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Inputs</h2>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="default">Default Input</Label>
            <Input id="default" placeholder="Default input" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="disabled">Disabled Input</Label>
            <Input id="disabled" placeholder="Disabled input" disabled />
          </div>
        </div>
      </section>
      
      {/* Card Showcase */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Card</h2>
        <Card className="border-border shadow-md">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description goes here</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This is the main content of the card.</p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline">Cancel</Button>
            <Button>Submit</Button>
          </CardFooter>
        </Card>
      </section>
      
      {/* Form Example */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Form Example</h2>
        <Card className="border-border shadow-md">
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Update your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Your email" />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Save Changes</Button>
          </CardFooter>
        </Card>
      </section>
    </div>
  )
}