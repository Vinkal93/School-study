"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, HelpCircle, MessageCircle } from "lucide-react";
import { useState } from "react";

import Link from "next/link";

const faqs = [
  {
    question: "How quickly can our school get started with SchoolStudy?",
    answer:
      "Your school can be completely operational within 24 hours. Our one-click bulk CSV import allows you to upload existing student rosters, faculty details, and class sections in minutes.",
  },
  {
    question: "Can parents pay school fees online using UPI or Debit Cards?",
    answer:
      "Yes! SchoolStudy integrates seamlessly with Razorpay and UPI. Parents can securely pay school fees 24/7 with automatic instant downloadable fee receipts and automated defaulter reminders.",
  },
  {
    question: "Does SchoolStudy support CBSE, ICSE, and State Board report cards?",
    answer:
      "Yes. Our exam scheduler, grading scales, CCE rubrics, and printable marksheet layouts are fully compliant with CBSE, ICSE, and State Board regulations.",
  },
  {
    question: "How secure is our school's student and financial data?",
    answer:
      "We utilize bank-grade encryption with strict multi-tenant school data isolation, automated daily backups, role-based access control, and 6-digit PIN ultra-security safeguards.",
  },
  {
    question: "Can teachers mark attendance from their mobile phones?",
    answer:
      "Yes, teachers can take daily roll call in under 30 seconds via the mobile PWA on any smartphone. Parents of absent students are notified automatically via real-time SMS.",
  },
  {
    question: "Do our staff and teachers receive training and onboarding assistance?",
    answer:
      "Yes! We provide dedicated live onboarding sessions, role-specific video tutorials, and priority WhatsApp and phone support to ensure effortless adoption.",
  },
];

export function FAQAccordionBlock() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="w-full bg-gradient-to-b from-background to-muted/30 px-4 py-16 md:py-24">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center md:mb-16"
        >
          <Badge className="mb-4" variant="secondary">
            <HelpCircle className="mr-1 h-3 w-3" />
            FAQ
          </Badge>
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Frequently Asked Questions
          </h2>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg">
            Have a question? We've got answers. If you don't find what you're
            looking for, feel free to contact us.
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
              >
                <Card className="overflow-hidden border-border/50 bg-card transition-all hover:border-primary/50 hover:shadow-md">
                  <motion.button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between p-4 text-left md:p-6"
                    whileHover={{
                      backgroundColor: "rgba(var(--primary), 0.03)",
                    }}
                  >
                    <span className="pr-4 text-base font-semibold md:text-lg">
                      {faq.question}
                    </span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="flex-shrink-0"
                    >
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    </motion.div>
                  </motion.button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border/50 p-4 md:p-6">
                          <motion.p
                            initial={{ y: -10 }}
                            animate={{ y: 0 }}
                            className="text-sm text-muted-foreground md:text-base"
                          >
                            {faq.answer}
                          </motion.p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center md:mt-16"
        >
          <Card className="border-border/50 bg-gradient-to-br from-card to-muted/30 p-6 md:p-8">
            <MessageCircle className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h3 className="mb-2 text-xl font-bold md:text-2xl">
              Still have questions?
            </h3>
            <p className="mb-6 text-sm text-muted-foreground md:text-base">
              Our team is here to help. Get in touch and we'll respond as soon
              as possible.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/contact">
                <Button size="lg" className="font-bold">Contact Support</Button>
              </Link>
              <Link href="/features">
                <Button size="lg" variant="outline" className="font-bold">
                  View Features
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
