"use client";

import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">LangGraph Agent</span>
            <Badge variant="secondary">Beta</Badge>
          </div>
          <nav className="flex items-center gap-4">
            <a href="#features" className="text-sm hover:underline">Features</a>
            <a href="#demo" className="text-sm hover:underline">Demo</a>
            <a href="#pricing" className="text-sm hover:underline">Pricing</a>
            <a href="/dashboard" className="text-sm hover:underline">Dashboard</a>
            <Button variant="outline" size="sm">
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-24 space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
            Your AI Agent Template
          </h1>
          <p className="max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            A fully functional React agent using LangGraph with a modern UI powered by CopilotKit.
            Build, customize, and deploy your AI assistant in minutes.
          </p>
          <div className="flex gap-4">
            <Button size="lg">Get Started</Button>
            <Button variant="outline" size="lg">Documentation</Button>
            <Button variant="secondary" size="lg" asChild>
              <a href="/dashboard">Try Airtable Demo →</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container py-24 space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Powerful Features</h2>
          <p className="text-gray-500">Everything you need to build advanced AI agents</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            title="LangGraph Integration"
            description="Built-in support for LangGraph, enabling complex agent workflows and state management."
          />
          <FeatureCard
            title="Screen Awareness"
            description="Agent can read and understand screen content using useCopilotReadable."
          />
          <FeatureCard
            title="Interactive Actions"
            description="Take actions on the UI through useCopilotAction with full type safety."
          />
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="container py-24 space-y-8 bg-slate-50 rounded-xl">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Try It Live</h2>
          <p className="text-gray-500">Interact with our demo agent and see the capabilities</p>
        </div>
        <div className="flex justify-center">
          <DemoContent />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container py-24 space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Simple Pricing</h2>
          <p className="text-gray-500">Start building for free, upgrade as you grow</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PricingCard
            title="Free"
            price="$0"
            description="Perfect for testing and small projects"
            features={["Basic agent capabilities", "Community support", "Limited API calls"]}
          />
          <PricingCard
            title="Pro"
            price="$49"
            description="For professional developers"
            features={["Advanced agent features", "Priority support", "Unlimited API calls"]}
            highlighted
          />
          <PricingCard
            title="Enterprise"
            price="Custom"
            description="For large organizations"
            features={["Custom integrations", "Dedicated support", "SLA guarantees"]}
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24 space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
          <p className="text-gray-500">Join developers building the future of AI agents</p>
          <Button size="lg" className="mt-4">Start Building Now</Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container py-8 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            © 2024 LangGraph Agent. All rights reserved.
          </div>
          <div className="flex gap-4">
            <a href="#" className="text-sm text-gray-500 hover:underline">Terms</a>
            <a href="#" className="text-sm text-gray-500 hover:underline">Privacy</a>
            <a href="#" className="text-sm text-gray-500 hover:underline">Contact</a>
          </div>
        </div>
      </footer>

      <CopilotSidebar
        defaultOpen={true}
        labels={{
          title: "AI Assistant",
          initial: "Hi! I'm your AI assistant. I can help you explore the features and capabilities of this template.",
        }}
      />
    </main>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

function PricingCard({ 
  title, 
  price, 
  description, 
  features,
  highlighted = false 
}: { 
  title: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <Card className={highlighted ? "border-primary shadow-lg" : ""}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="text-3xl font-bold">{price}</div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center">
              <svg
                className="mr-2 h-4 w-4 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
        <Button className="w-full mt-4" variant={highlighted ? "default" : "outline"}>
          Get Started
        </Button>
      </CardContent>
    </Card>
  );
}

function DemoContent() {
  const [backgroundColor, setBackgroundColor] = useState("#ADD8E6");


  return (
    <div
      style={{ backgroundColor }}
      className="w-full max-w-2xl p-8 rounded-xl transition-colors"
    >
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4">Interactive Demo</h3>
        <p className="text-gray-600 mb-4">
          Try asking the AI assistant to:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li>Change the background color</li>
          <li>Explain how the agent works</li>
          <li>Show available actions</li>
        </ul>
      </div>
    </div>
  );
}
