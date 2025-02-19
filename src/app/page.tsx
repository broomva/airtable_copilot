"use client";

import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { useState } from "react";

// Header Component
function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white shadow-sm">
      <nav className="container mx-auto px-6 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-xl font-bold text-blue-600">LangGraph Agent</span>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-gray-600 hover:text-blue-600 text-sm">Features</a>
            <a href="#demo" className="text-gray-600 hover:text-blue-600 text-sm">Demo</a>
            <a href="#pricing" className="text-gray-600 hover:text-blue-600 text-sm">Pricing</a>
            <button className="bg-blue-600 text-white px-4 py-1.5 rounded-full hover:bg-blue-700 text-sm">
              Get Started
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}

// Hero Section
function Hero() {
  return (
    <section className="pt-32 pb-20 bg-gradient-to-r from-blue-50 to-indigo-50">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-12 md:mb-0">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Intelligent Agent for Your Web Apps
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              A powerful LangGraph-based agent that can read, understand, and interact with your web interface. Built with CopilotKit for seamless integration.
            </p>
            <button className="bg-blue-600 text-white px-8 py-3 rounded-full text-lg hover:bg-blue-700 mr-4">
              Try Demo
            </button>
            <button className="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-full text-lg hover:bg-blue-50">
              Documentation
            </button>
          </div>
          <div className="md:w-1/2">
            <img src="/hero-image.png" alt="Agent Demo" className="rounded-lg shadow-xl" />
          </div>
        </div>
      </div>
    </section>
  );
}

// Features Section
function Features() {
  const features = [
    {
      title: "Screen Understanding",
      description: "Agent can read and understand content from your web interface",
      icon: "🔍"
    },
    {
      title: "Interactive Actions",
      description: "Execute actions and modify UI elements in real-time",
      icon: "⚡"
    },
    {
      title: "Memory Persistence",
      description: "Maintains context across conversations with thread management",
      icon: "🧠"
    },
    {
      title: "Tool Integration",
      description: "Easily extend functionality with custom tools and actions",
      icon: "🛠️"
    }
  ];

  return (
    <section id="features" className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
          Powerful Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Demo Section
function Demo() {
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");

  // Make the demo section readable by the agent
  useCopilotReadable({
    description: "Interactive demo section",
    value: "This is the interactive demo section where users can test the agent's capabilities. You can help users interact with the demo by greeting them or changing the background color."
  });

  // Render a greeting in the chat
  useCopilotAction({
    name: "greetUser",
    parameters: [
      {
        name: "name",
        description: "The name of the user to greet.",
      },
    ],
    render: ({ args }) => {
      return (
        <div className="text-lg font-bold bg-blue-500 text-white p-2 rounded-xl text-center">
          Hello, {args.name}!
        </div>
      );
    },
  });

  // Action for setting the background color
  useCopilotAction({
    name: "setBackgroundColor",
    parameters: [
      {
        name: "backgroundColor",
        description: "The background color to set. Make sure to pick nice colors.",
      },
    ],
    handler({ backgroundColor }) {
      setBackgroundColor(backgroundColor);
    },
  });

  return (
    <section id="demo" className="py-20" style={{ backgroundColor }}>
      <div className="container mx-auto px-6">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
          Try It Yourself
        </h2>
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-lg">
          <p className="text-gray-600 mb-6 text-center">
            Interact with the agent using the sidebar chat. Try asking it to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-6">
            <li>Greet you by name</li>
            <li>Change the background color</li>
            <li>Ask about the features</li>
            <li>Get information about the demo</li>
          </ul>
          <div className="bg-gray-50 p-4 rounded-lg">
            <code className="text-sm">
              Example: "Can you greet me? My name is John"
            </code>
          </div>
        </div>
      </div>
    </section>
  );
}

// Pricing Section
function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "Free",
      features: ["Basic agent functionality", "3 custom actions", "Community support"],
    },
    {
      name: "Pro",
      price: "$49/mo",
      features: ["Advanced agent capabilities", "Unlimited actions", "Priority support", "Custom tools"],
    },
    {
      name: "Enterprise",
      price: "Custom",
      features: ["Custom deployment", "SLA guarantee", "Dedicated support", "Advanced security"],
    },
  ];

  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
          Simple Pricing
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div key={index} className="bg-white p-8 rounded-lg shadow-lg">
              <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
              <div className="text-4xl font-bold mb-6">{plan.price}</div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                Get Started
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Footer Component
function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h4 className="text-xl font-bold mb-4">LangGraph Agent</h4>
            <p className="text-gray-400">
              Building the future of interactive web agents.
            </p>
          </div>
          <div>
            <h4 className="text-xl font-bold mb-4">Links</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="text-gray-400 hover:text-white">Features</a></li>
              <li><a href="#demo" className="text-gray-400 hover:text-white">Demo</a></li>
              <li><a href="#pricing" className="text-gray-400 hover:text-white">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xl font-bold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white">Documentation</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">API Reference</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xl font-bold mb-4">Contact</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white">GitHub</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Twitter</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Discord</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>© 2024 LangGraph Agent. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Features />
      <Demo />
      <Pricing />
      <Footer />
      <div className="fixed top-0 right-0 z-50 pt-14">
        <CopilotSidebar
          defaultOpen={false}
          labels={{
            title: "AI Assistant",
            initial: "Hi! I'm your AI assistant. I can help you explore the demo and interact with the page. Try asking me to greet you or change the background color!",
          }}
        />
      </div>
    </main>
  );
}
