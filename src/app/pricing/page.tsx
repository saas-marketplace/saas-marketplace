"use client";

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";

export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      price: "29",
      description: "Perfect for individuals and small projects",
      features: [
        "Up to 5 freelancers",
        "Basic product listings",
        "Email support",
        "Analytics dashboard",
        "Standard themes",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Professional",
      price: "79",
      description: "Best for growing businesses and teams",
      features: [
        "Up to 25 freelancers",
        "Unlimited products",
        "Priority support",
        "Advanced analytics",
        "Custom themes",
        "API access",
        "Custom domain",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "199",
      description: "For large organizations with custom needs",
      features: [
        "Unlimited freelancers",
        "Unlimited products",
        "24/7 dedicated support",
        "White-label solution",
        "Custom integrations",
        "SLA guarantee",
        "Dedicated account manager",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Simple, Transparent <span className="gradient-text">Pricing</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Choose the perfect plan for your business. All plans include a 14-day free trial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 border ${
                plan.popular
                  ? "border-primary bg-primary/5 relative"
                  : "border-border bg-card"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-white text-sm px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full ${
                  plan.popular ? "gradient-bg" : ""
                }`}
                variant={plan.popular ? "default" : "outline"}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-4">
            Need a custom solution? We've got you covered.
          </p>
          <Button variant="link" asChild>
            <Link href="/contact">Contact us for custom pricing</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
