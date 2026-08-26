"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Minus, Plus, Building, Shield, Users, Smartphone, Headphones } from "lucide-react";

export function PricingContent() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const plans = [
    {
      name: "Starter",
      description: "For small schools just getting started.",
      priceMonthly: "₹999",
      priceAnnual: "₹799",
      popular: false,
      features: [
        "Student Management",
        "Teacher Management",
        "Class & Section Management",
        "Basic Attendance",
        "Student Portal",
        "Teacher Portal",
        "Basic Support"
      ],
      ctaText: "Get Started",
      ctaHref: "/contact",
      ctaPrimary: false
    },
    {
      name: "Professional",
      description: "For growing schools with more needs.",
      priceMonthly: "₹1,999",
      priceAnnual: "₹1,599",
      popular: true,
      features: [
        "Everything in Starter",
        "Advanced Attendance",
        "School Dashboard",
        "Notices & Announcements",
        "Advanced Reports",
        "Priority Support",
        "More Staff Accounts"
      ],
      ctaText: "Choose Professional",
      ctaHref: "/contact",
      ctaPrimary: true
    },
    {
      name: "Enterprise",
      description: "For large institutions and multi-schools.",
      priceMonthly: "Custom",
      priceAnnual: "Custom",
      popular: false,
      features: [
        "Everything in Professional",
        "Multiple School Support",
        "Custom Requirements",
        "Dedicated Support",
        "Advanced Controls",
        "Custom Onboarding"
      ],
      ctaText: "Contact Sales",
      ctaHref: "/contact",
      ctaPrimary: false
    }
  ];

  const compareFeatures = [
    { name: "Students", starter: "Up to 500", pro: "Up to 2000", ent: "Unlimited" },
    { name: "Teachers", starter: "Up to 25", pro: "Up to 100", ent: "Unlimited" },
    { name: "Attendance", starter: "Basic", pro: "Advanced", ent: "Advanced" },
    { name: "Reports", starter: "Standard", pro: "Advanced", ent: "Custom" },
    { name: "Support", starter: "Email", pro: "Priority", ent: "Dedicated 24/7" },
    { name: "Multi School", starter: "No", pro: "No", ent: "Yes" },
    { name: "Custom Features", starter: "No", pro: "No", ent: "Yes" },
    { name: "Dedicated Onboarding", starter: "No", pro: "No", ent: "Yes" },
  ];

  const faqs = [
    {
      question: "Can I change my plan later?",
      answer: "Yes, you can upgrade or downgrade your plan at any time. If you upgrade, the prorated difference will be applied to your next billing cycle."
    },
    {
      question: "Is there a monthly and annual option?",
      answer: "Yes, we offer both monthly and annual billing. If you choose annual billing, you can save 20% compared to the monthly option."
    },
    {
      question: "Can I cancel my subscription?",
      answer: "Absolutely. You can cancel your subscription anytime from your billing dashboard. You will retain access until the end of your current billing period."
    },
    {
      question: "Can I contact support before choosing a plan?",
      answer: "Of course! Our sales and support teams are happy to help you decide which plan is best for your school's specific needs."
    },
    {
      question: "What happens if I need more students?",
      answer: "If you exceed the student limit of your current plan, you can easily upgrade to the next tier or contact us for a custom enterprise plan."
    }
  ];

  const trustFeatures = [
    { icon: <Building className="w-6 h-6" />, title: "Simple Setup", description: "Get up and running in minutes, not days." },
    { icon: <Shield className="w-6 h-6" />, title: "Secure Platform", description: "Your data is encrypted and backed up daily." },
    { icon: <Users className="w-6 h-6" />, title: "Student & Teacher Access", description: "Dedicated portals for everyone." },
    { icon: <Smartphone className="w-6 h-6" />, title: "Responsive Experience", description: "Works perfectly on any device." },
    { icon: <Headphones className="w-6 h-6" />, title: "Reliable Support", description: "We're here to help when you need it." },
  ];

  return (
    <div className="w-full pb-16">
      {/* Hero Section */}
      <section className="py-16 md:py-24 text-center px-4 max-w-4xl mx-auto">
        <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-blue-700 bg-blue-100 rounded-full dark:bg-blue-900/30 dark:text-blue-300">
          Simple, Transparent Pricing
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight">
          Choose the Right Plan for Your School
        </h1>
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto">
          Whether you're a small coaching center or a large institution, we have a plan that fits your needs perfectly.
        </p>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-medium ${!isAnnual ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative inline-flex h-7 w-14 items-center rounded-full bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Toggle annual billing"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isAnnual ? "translate-x-8" : "translate-x-1"}`}
            />
          </button>
          <span className={`flex items-center gap-2 text-sm font-medium ${isAnnual ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
            Annual
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              Save 20%
            </span>
          </span>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 pb-20 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 items-start">
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`relative flex flex-col p-8 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border ${plan.popular ? "border-blue-500 shadow-md ring-2 ring-blue-500" : "border-slate-200 dark:border-slate-800"} h-full`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-blue-600 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{plan.name}</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm h-10">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                    {plan.priceMonthly === "Custom" ? "Custom" : (isAnnual ? plan.priceAnnual : plan.priceMonthly)}
                  </span>
                  {plan.priceMonthly !== "Custom" && (
                    <span className="text-slate-500 dark:text-slate-400 font-medium">/mo</span>
                  )}
                </div>
                {plan.priceMonthly !== "Custom" && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 h-5">
                    {isAnnual ? `Billed annually` : "Billed monthly"}
                  </p>
                )}
                {plan.priceMonthly === "Custom" && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 h-5">Let's Talk</p>}
              </div>

              <ul className="flex-grow space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <span className="text-slate-700 dark:text-slate-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link 
                href={plan.ctaHref}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-center transition-colors ${
                  plan.ctaPrimary 
                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                    : "bg-transparent border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                {plan.ctaText}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Compare Plans Table */}
      <section className="py-20 px-4 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Compare Plans in Detail</h2>
            <p className="text-slate-600 dark:text-slate-400">Find out which plan has the exact features you need.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b-2 border-slate-200 dark:border-slate-800">
                  <th className="py-4 px-6 font-semibold text-slate-900 dark:text-white w-1/4">Feature</th>
                  <th className="py-4 px-6 font-semibold text-slate-900 dark:text-white w-1/4 text-center">Starter</th>
                  <th className="py-4 px-6 font-semibold text-blue-600 dark:text-blue-400 w-1/4 text-center bg-blue-50/50 dark:bg-blue-900/10">Professional</th>
                  <th className="py-4 px-6 font-semibold text-slate-900 dark:text-white w-1/4 text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {compareFeatures.map((feature, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">{feature.name}</td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400 text-center">
                      {feature.starter === "Yes" ? <Check className="w-5 h-5 mx-auto text-green-500" /> : feature.starter === "No" ? <Minus className="w-5 h-5 mx-auto text-slate-300 dark:text-slate-600" /> : feature.starter}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-900 dark:text-slate-200 text-center font-medium bg-blue-50/30 dark:bg-blue-900/5">
                      {feature.pro === "Yes" ? <Check className="w-5 h-5 mx-auto text-green-500" /> : feature.pro === "No" ? <Minus className="w-5 h-5 mx-auto text-slate-300 dark:text-slate-600" /> : feature.pro}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400 text-center">
                      {feature.ent === "Yes" ? <Check className="w-5 h-5 mx-auto text-green-500" /> : feature.ent === "No" ? <Minus className="w-5 h-5 mx-auto text-slate-300 dark:text-slate-600" /> : feature.ent}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Built for Modern Schools (Trust Bar) */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Built for Modern Schools</h2>
          <p className="text-slate-600 dark:text-slate-400">Everything you need to manage your institution efficiently.</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {trustFeatures.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                {item.icon}
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-slate-600 dark:text-slate-400">Have questions? We have answers.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-800 h-fit">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="flex items-center justify-between w-full p-5 text-left focus:outline-none"
                  aria-expanded={openFaq === idx}
                >
                  <h3 className="font-semibold text-slate-900 dark:text-white text-base">{faq.question}</h3>
                  {openFaq === idx ? (
                    <Minus className="w-5 h-5 text-blue-600 shrink-0 ml-4" />
                  ) : (
                    <Plus className="w-5 h-5 text-slate-400 shrink-0 ml-4" />
                  )}
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === idx ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`}
                >
                  <p className="p-5 pt-0 text-slate-600 dark:text-slate-400 text-sm">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4 text-center max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6">Ready to simplify your school?</h2>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-10">
          Join thousands of educators who are already using School Study to transform their institutions.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/contact" 
            className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-center"
          >
            Get Started
          </Link>
          <Link 
            href="/contact" 
            className="w-full sm:w-auto px-8 py-3 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-900 dark:text-white font-semibold rounded-lg transition-colors text-center"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}
