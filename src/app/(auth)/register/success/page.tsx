"use client";

import Link from "next/link";
import Image from "next/image";
import { CheckCircle, ArrowRight, Mail, Shield } from "lucide-react";

export default function RegisterSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Success Card */}
        <div className="bg-card rounded-2xl shadow-xl border border-border p-8 text-center">
          {/* Success Icon with Animation */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
            <div className="relative bg-primary/10 rounded-full p-4">
              <CheckCircle className="w-16 h-16 text-primary" strokeWidth={1.5} />
            </div>
          </div>

          {/* Logo */}
          <div className="inline-flex items-center justify-center mb-4">
            <Image
              src="/logo.svg"
              alt="SeenOS Logo"
              width={48}
              height={48}
              priority
              className="drop-shadow-md"
            />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Registration Successful!
          </h1>
          
          {/* Subtitle */}
          <p className="text-muted-foreground mb-8">
            Your account has been created successfully. You can now sign in to start using SeenOS.
          </p>

          {/* Features List */}
          <div className="bg-muted/30 rounded-xl p-4 mb-8 text-left">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Email Verified</p>
                  <p className="text-xs text-muted-foreground">Your email has been confirmed</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Account Secured</p>
                  <p className="text-xs text-muted-foreground">Your credentials are safely stored</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sign In Button */}
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-foreground text-background font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all group"
          >
            Go to Sign In
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Help Text */}
          <p className="mt-6 text-xs text-muted-foreground">
            Having trouble?{" "}
            <a href="mailto:support@seenos.ai" className="text-primary hover:text-primary/80">
              Contact Support
            </a>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-sm text-muted-foreground">
          Welcome to the SeenOS community! 🎉
        </p>
      </div>
    </div>
  );
}
