"use client";

import { useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, Github, Instagram, Twitter, Linkedin, Youtube } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { APP_NAME } from "@/utils/constants";

export default function ContactPage() {
  const t = useTranslations('contact');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setFormData({ name: '', email: '', message: '' });
      alert(t('successMessage'));
    }, 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-luxury-black text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-white/5 px-6 py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-luxury-black via-luxury-black/95 to-luxury-black" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4 text-4xl font-light text-white sm:text-5xl md:text-6xl"
          >
            {t('title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto max-w-2xl text-base leading-relaxed text-luxury-silver/70 sm:text-lg"
          >
            {t('description')}
          </motion.p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="relative px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/[0.03] to-transparent p-8 backdrop-blur-xl shadow-[0_20px_70px_-30px_rgba(0,0,0,0.7)] md:p-10">
                <h2 className="mb-6 text-2xl font-semibold text-white">{t('formTitle')}</h2>
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="mb-2 block text-sm font-medium text-white/80">
                      {t('form.name')}
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/30 transition-all"
                      placeholder={t('form.namePlaceholder')}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="mb-2 block text-sm font-medium text-white/80">
                      {t('form.email')}
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/30 transition-all"
                      placeholder={t('form.emailPlaceholder')}
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="mb-2 block text-sm font-medium text-white/80">
                      {t('form.message')}
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/30 transition-all resize-none"
                      placeholder={t('form.messagePlaceholder')}
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full rounded-lg bg-gradient-to-r from-luxury-gold to-luxury-lightGold px-6 py-3.5 text-sm font-semibold text-black transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                        {t('form.submitting')}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        {t('form.submit')}
                      </>
                    )}
                  </motion.button>
                </form>
              </div>
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-8"
            >
              <div>
                <h2 className="mb-6 text-2xl font-semibold text-white">{t('infoTitle')}</h2>
                <p className="mb-8 text-base leading-relaxed text-luxury-silver/70">
                  {t('infoDescription')}
                </p>
              </div>

              <div className="space-y-6">
                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-luxury-gold/10 p-3">
                    <Mail className="h-5 w-5 text-luxury-gold" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-white">{t('info.email')}</h3>
                    <a
                      href="mailto:info@cahayasilverking.id"
                      className="text-sm text-luxury-silver/70 hover:text-luxury-gold transition-colors"
                    >
                      info@cahayasilverking.id
                    </a>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-luxury-gold/10 p-3">
                    <Phone className="h-5 w-5 text-luxury-gold" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-white">{t('info.phone')}</h3>
                    <a
                      href="tel:+62123456789"
                      className="text-sm text-luxury-silver/70 hover:text-luxury-gold transition-colors"
                    >
                      +62 123 456 789
                    </a>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-luxury-gold/10 p-3">
                    <MapPin className="h-5 w-5 text-luxury-gold" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-white">{t('info.address')}</h3>
                    <p className="text-sm text-luxury-silver/70">
                      {t('info.addressValue')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div className="pt-6 border-t border-white/10">
                <h3 className="mb-4 text-sm font-semibold text-white">{t('socialTitle')}</h3>
                <div className="flex gap-4">
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-white/10 bg-white/5 p-3 text-white/60 hover:border-luxury-gold/40 hover:bg-white/10 hover:text-luxury-gold transition-all"
                  >
                    <Github className="h-5 w-5" />
                  </a>
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-white/10 bg-white/5 p-3 text-white/60 hover:border-luxury-gold/40 hover:bg-white/10 hover:text-luxury-gold transition-all"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                  <a
                    href="https://twitter.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-white/10 bg-white/5 p-3 text-white/60 hover:border-luxury-gold/40 hover:bg-white/10 hover:text-luxury-gold transition-all"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-white/10 bg-white/5 p-3 text-white/60 hover:border-luxury-gold/40 hover:bg-white/10 hover:text-luxury-gold transition-all"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a
                    href="https://youtube.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-white/10 bg-white/5 p-3 text-white/60 hover:border-luxury-gold/40 hover:bg-white/10 hover:text-luxury-gold transition-all"
                  >
                    <Youtube className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <p className="text-xs text-white/40">
              © {new Date().getFullYear()} {APP_NAME}. {t('footer.rights')}
            </p>
            <div className="flex gap-6 text-sm">
              <Link href={`/${locale}/what-we-do`} className="text-white/60 hover:text-white transition-colors">
                {tNav('whatWeDo')}
              </Link>
              <Link href={`/${locale}/authenticity`} className="text-white/60 hover:text-white transition-colors">
                {tNav('authenticity')}
              </Link>
              <Link href={`/${locale}/products`} className="text-white/60 hover:text-white transition-colors">
                {tNav('products')}
              </Link>
              <Link href={`/${locale}/about`} className="text-white/60 hover:text-white transition-colors">
                {tNav('aboutUs')}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
