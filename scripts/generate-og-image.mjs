import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070B14" />
      <stop offset="50%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#050811" />
    </linearGradient>
    <linearGradient id="accent-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#1D4ED8" />
    </linearGradient>
    <linearGradient id="card-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E293B" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0.95" />
    </linearGradient>
    <radialGradient id="glow-blue" cx="15%" cy="15%" r="50%">
      <stop offset="0%" stop-color="#2563EB" stop-opacity="0.32" />
      <stop offset="100%" stop-color="#2563EB" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="glow-indigo" cx="85%" cy="75%" r="50%">
      <stop offset="0%" stop-color="#4F46E5" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#4F46E5" stop-opacity="0" />
    </radialGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" stroke-width="1" stroke-opacity="0.45" />
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg-grad)" />
  <rect width="1200" height="630" fill="url(#grid)" />
  <circle cx="180" cy="120" r="320" fill="url(#glow-blue)" />
  <circle cx="1020" cy="480" r="300" fill="url(#glow-indigo)" />

  <!-- LEFT COLUMN: BRANDING &amp; HEADLINE -->
  <g transform="translate(80, 75)">
    <!-- Category pill -->
    <rect x="0" y="0" width="260" height="34" rx="17" fill="#1E293B" stroke="#3B82F6" stroke-width="1.5" />
    <circle cx="18" cy="17" r="5" fill="#10B981" />
    <text x="32" y="22" fill="#93C5FD" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" letter-spacing="0.5">SMART SCHOOL ERP PLATFORM</text>

    <!-- Brand Header -->
    <g transform="translate(0, 54)">
      <!-- Icon -->
      <rect width="52" height="52" rx="14" fill="url(#accent-grad)" />
      <path d="M26 14L10 23L26 32L42 23L26 14Z" fill="white" />
      <path d="M16 26.5V33.5C16 33.5 20.5 37 26 37C31.5 37 36 33.5 36 33.5V26.5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <path d="M39 25V34" stroke="white" stroke-width="2.5" stroke-linecap="round" />
      
      <!-- Brand Name -->
      <text x="68" y="37" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="800" letter-spacing="-0.5">School Study</text>
    </g>

    <!-- Main Value Proposition -->
    <text x="0" y="165" fill="#F8FAFC" font-family="system-ui, -apple-system, sans-serif" font-size="42" font-weight="800" letter-spacing="-1">
      Modern Management
    </text>
    <text x="0" y="215" fill="#60A5FA" font-family="system-ui, -apple-system, sans-serif" font-size="42" font-weight="800" letter-spacing="-1">
      For Smarter Schools.
    </text>

    <!-- Description -->
    <text x="0" y="270" fill="#94A3B8" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="400">
      Complete cloud operating system for students, teachers,
    </text>
    <text x="0" y="298" fill="#94A3B8" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="400">
      live attendance, academic rosters &amp; fee collection.
    </text>

    <!-- Badges / Feature Pills -->
    <g transform="translate(0, 340)">
      <rect x="0" y="0" width="130" height="32" rx="8" fill="#1E293B" stroke="#334155" stroke-width="1" />
      <text x="16" y="20" fill="#E2E8F0" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600">✓ Multi-Tenant</text>

      <rect x="142" y="0" width="136" height="32" rx="8" fill="#1E293B" stroke="#334155" stroke-width="1" />
      <text x="158" y="20" fill="#E2E8F0" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600">✓ Live Roll Call</text>

      <rect x="290" y="0" width="150" height="32" rx="8" fill="#1E293B" stroke="#334155" stroke-width="1" />
      <text x="306" y="20" fill="#E2E8F0" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600">✓ Role Portals</text>
    </g>

    <!-- Domain Footer -->
    <g transform="translate(0, 420)">
      <circle cx="10" cy="10" r="4" fill="#3B82F6" />
      <text x="24" y="15" fill="#64748B" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="600">https://school.sbci.online</text>
    </g>
  </g>

  <!-- RIGHT COLUMN: PRODUCT DASHBOARD MOCKUP -->
  <g transform="translate(650, 75)">
    <!-- Outer Card Window -->
    <rect width="470" height="475" rx="24" fill="url(#card-grad)" stroke="#334155" stroke-width="1.5" />

    <!-- Window Dots -->
    <circle cx="28" cy="26" r="6" fill="#EF4444" />
    <circle cx="48" cy="26" r="6" fill="#F59E0B" />
    <circle cx="68" cy="26" r="6" fill="#10B981" />
    <text x="96" y="31" fill="#64748B" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600">School Study Dashboard — Principal View</text>
    <line x1="0" y1="52" x2="470" y2="52" stroke="#334155" stroke-width="1" />

    <!-- 2 Metric Cards -->
    <g transform="translate(24, 72)">
      <!-- Card 1: Students -->
      <rect x="0" y="0" width="200" height="95" rx="14" fill="#0F172A" stroke="#1E293B" stroke-width="1" />
      <text x="16" y="28" fill="#94A3B8" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600">TOTAL STUDENTS</text>
      <text x="16" y="62" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="800">1,420</text>
      <text x="16" y="82" fill="#10B981" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600">↑ 100% Active Enrolled</text>

      <!-- Card 2: Attendance -->
      <rect x="222" y="0" width="200" height="95" rx="14" fill="#0F172A" stroke="#1E293B" stroke-width="1" />
      <text x="238" y="28" fill="#94A3B8" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600">TODAY'S ATTENDANCE</text>
      <text x="238" y="62" fill="#38BDF8" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="800">97.8%</text>
      <text x="238" y="82" fill="#94A3B8" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600">Live Roll Call Verified</text>
    </g>

    <!-- Attendance Section -->
    <g transform="translate(24, 190)">
      <rect width="422" height="155" rx="14" fill="#0F172A" stroke="#1E293B" stroke-width="1" />
      <text x="18" y="28" fill="#F1F5F9" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700">Class Attendance Progress</text>
      <text x="340" y="28" fill="#10B981" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700">● LIVE SYNC</text>

      <!-- Row 1: Grade 10-A -->
      <text x="18" y="62" fill="#CBD5E1" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600">Grade 10 - Section A</text>
      <text x="365" y="62" fill="#94A3B8" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600">42 / 44</text>
      <rect x="18" y="72" width="386" height="8" rx="4" fill="#1E293B" />
      <rect x="18" y="72" width="368" height="8" rx="4" fill="#3B82F6" />

      <!-- Row 2: Grade 9-B -->
      <text x="18" y="110" fill="#CBD5E1" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600">Grade 9 - Section B</text>
      <text x="365" y="110" fill="#94A3B8" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600">38 / 38</text>
      <rect x="18" y="120" width="386" height="8" rx="4" fill="#1E293B" />
      <rect x="18" y="120" width="386" height="8" rx="4" fill="#10B981" />
    </g>

    <!-- Security Guarantee Badge -->
    <g transform="translate(24, 370)">
      <rect width="422" height="75" rx="14" fill="#1E293B" fill-opacity="0.6" stroke="#334155" stroke-width="1" />
      <circle cx="36" cy="37" r="16" fill="#1E3A8A" />
      <path d="M36 27L42 30V35C42 39 39 42 36 44C33 42 30 39 30 35V30L36 27Z" fill="#60A5FA" />
      <text x="64" y="32" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700">Enterprise Multi-Tenant Security</text>
      <text x="64" y="50" fill="#94A3B8" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="400">Strict school-level data isolation and role-based access</text>
    </g>
  </g>
</svg>
`;

const outputPath = path.resolve(process.cwd(), 'public/og-image.png');

sharp(Buffer.from(svg))
  .png({ quality: 95, compressionLevel: 8 })
  .toFile(outputPath)
  .then(info => {
    console.log('Successfully generated public/og-image.png:', info);
  })
  .catch(err => {
    console.error('Failed to generate image:', err);
    process.exit(1);
  });
