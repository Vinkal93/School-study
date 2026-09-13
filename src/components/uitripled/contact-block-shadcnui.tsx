"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { CheckCircle2, Mail, MapPin, Phone, Send } from "lucide-react";
import { useState } from "react";

const contactInfo = [
  {
    icon: Mail,
    label: "Email Us",
    value: "support@schoolstudy.in",
    href: "mailto:support@schoolstudy.in",
  },
  {
    icon: Phone,
    label: "Call / WhatsApp",
    value: "+91 94157 56839",
    href: "tel:+919415756839",
  },
  {
    icon: MapPin,
    label: "Headquarters",
    value: "Lucknow / New Delhi, India",
    href: "#",
  },
];

export function ContactBlock() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.email && formData.name) {
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setFormData({ name: "", email: "", subject: "", message: "" });
      }, 4000);
    }
  };

  return (
    <section className="relative w-full overflow-hidden bg-background px-4 py-12 sm:py-16 md:py-20 lg:py-24">
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>

      <div className="mx-auto w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 sm:mb-16 md:mb-20 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Talk to Our Education Consultants
          </h2>
          <p className="mx-auto max-w-2xl px-4 text-base text-muted-foreground sm:text-lg">
            Schedule a personalized live demo, ask questions about custom plans, or discuss onboarding your institution today.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="relative overflow-hidden rounded-xl border border-border/40 bg-background/60 p-6 backdrop-blur-sm sm:p-8">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
              {isSubmitted ? (
                <div className="relative z-10 flex flex-col items-center justify-center py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Message Sent Successfully!</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Thank you for reaching out. Our education team will contact you within 2-4 business hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">
                        Your Name
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="e.g. Principal Sharma"
                        className="bg-background/50 transition-colors focus:bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">
                        Official Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        placeholder="principal@school.edu.in"
                        className="bg-background/50 transition-colors focus:bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-sm font-medium">
                      School / Institution Name
                    </Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g. Delhi Public School, Lucknow"
                      className="bg-background/50 transition-colors focus:bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-sm font-medium">
                      How Can We Help You?
                    </Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      placeholder="Tell us about your student strength, current pain points, or request a demo..."
                      rows={5}
                      className="resize-none bg-background/50 transition-colors focus:bg-background"
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2 text-base font-bold shadow-md shadow-blue-500/20">
                    Send Inquiry
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              )}
            </Card>
          </motion.div>

          {/* Contact Info */}
          <div className="space-y-6 lg:space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {contactInfo.map((info, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                >
                  <Card className="group relative overflow-hidden rounded-xl border border-border/40 bg-background/60 p-4 transition-all duration-300 hover:border-foreground/20 hover:shadow-md hover:-translate-y-1 backdrop-blur-sm sm:p-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <a
                      href={info.href}
                      className="relative z-10 flex items-center gap-4"
                    >
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <info.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="mb-1 font-semibold text-foreground">
                          {info.label}
                        </h3>
                        <p className="text-sm text-muted-foreground transition-colors group-hover:text-foreground/80">
                          {info.value}
                        </p>
                      </div>
                    </a>
                  </Card>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <Card className="rounded-xl border border-border/40 bg-background/60 p-6 backdrop-blur-sm sm:p-8">
                <h3 className="mb-4 text-xl font-semibold text-foreground">
                  Working Hours
                </h3>
                <div className="space-y-3 text-sm text-muted-foreground sm:text-base">
                  <div className="flex justify-between border-b border-border/40 pb-2">
                    <span>Monday - Friday</span>
                    <span className="font-medium text-foreground">
                      9:00 AM - 6:00 PM
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-2">
                    <span>Saturday</span>
                    <span className="font-medium text-foreground">
                      10:00 AM - 4:00 PM
                    </span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span>Sunday</span>
                    <span className="font-medium text-foreground">Closed</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
