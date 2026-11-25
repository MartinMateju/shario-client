// Draft Shario platform documents, adapted from earlier reviewed drafts. Confirm
// the provider identity, contact address and legal commitments before removing
// the pages' noindex setting or relying on them for live subscriptions.
export const LEGAL_VERSION = "2026-11-15";
export const LEGAL_UPDATED_DATE = "2026-11-15";

export const LEGAL_PROVIDER = Object.freeze({
  name: "BNO Lab s.r.o.",
  registrationNumber: "30192251",
  address: "Vančurova 3335/49, Židenice, 615 00 Brno, Czech Republic",
  register:
    "Commercial Register maintained by the Regional Court in Brno, section C, file 154667",
  email: "hello@shario.io",
});

const providerDetails = `${LEGAL_PROVIDER.name}, company registration number (IČO) ${LEGAL_PROVIDER.registrationNumber}, registered office: ${LEGAL_PROVIDER.address}. Registered in the ${LEGAL_PROVIDER.register}. Contact for contractual and privacy matters: ${LEGAL_PROVIDER.email}.`;

export const LEGAL_DOCUMENTS = Object.freeze({
  terms: {
    title: "Terms of Service",
    description:
      "Business subscription terms for Shario, including payments, cancellation, studio responsibilities and a data processing addendum.",
    sections: [
      {
        id: "provider-and-scope",
        title: "1. Who provides Shario and who these Terms cover",
        paragraphs: [
          providerDetails,
          "These Terms form the agreement between BNO Lab s.r.o. (Shario, we, us) and the business, organisation or self-employed professional subscribing to Shario (you, the studio). The person accepting must have authority to bind that customer. Shario is intended for professional studio operations, not personal consumer subscriptions. A label in these Terms does not remove any mandatory protection that applies to a particular customer.",
          "The agreement consists of these Terms, the plan and billing details accepted when subscribing, and any signed order or service agreement. A signed agreement prevails over conflicting general terms; the data processing addendum below prevails for personal-data processing. The Privacy Policy explains our handling of personal information and is not a request for blanket consent to unrelated processing.",
        ],
      },
      {
        id: "service-and-accounts",
        title: "2. The service and your account",
        paragraphs: [
          "Shario provides hosted software for studio bookings, customers, payments and studio operations. Available workflows, locations, team accounts, email allowances and AI features depend on the selected plan, settings and permissions. Descriptions on the pricing page concern current plans; an existing subscription may retain an earlier plan version.",
          "Keep your account and billing information accurate, protect credentials, assign appropriate staff access and promptly report suspected misuse. You are responsible for authorised users and the instructions they give through your workspace. Use the service lawfully; do not interfere with its security, access another studio's data, distribute malicious content, send unlawful marketing or evade usage limits.",
          "We provide support through hello@shario.io. A particular response time, uninterrupted availability or service-level credit applies only if expressly agreed in writing. We may carry out maintenance and make reasonable changes to improve, secure or maintain the service. We will not materially reduce the core paid service during an existing paid period without a reasonable alternative or the termination and refund rights below.",
        ],
      },
      {
        id: "trial",
        title: "3. Free trial and expiry",
        paragraphs: [
          "An eligible new studio receives a 14-day Professional trial starting when onboarding is completed. No payment card is required. Studio Plus features, including entry-code management, custom domains and advanced AI tools, are not included in the Professional trial. Starting a card-free trial does not by itself authorise a paid subscription or charge.",
          "If no paid subscription is active when the trial expires, the workspace becomes restricted: new bookings, online purchases and subscription-gated workspace features stop. The public website can remain visible, and supported customer history, existing-booking management and billing recovery routes remain available. This is not full read-only workspace or unrestricted export access. Choose a paid plan to restore eligible features.",
          "Expiry does not automatically delete the studio's records. It also does not promise indefinite retention. Arrange any needed export before restriction, or contact support about data return or deletion. Cancelling a card-free trial ends trial access immediately.",
        ],
      },
      {
        id: "billing-and-payment-fees",
        title: "4. Subscription billing and customer payment fees",
        paragraphs: [
          "When you complete the paid subscription process, you authorise the recurring charge shown at checkout for the selected monthly or yearly billing period until cancellation. Where checkout preserves your remaining trial, the first paid period starts at the displayed trial-end date rather than being charged immediately. Plan checkout is unavailable in the final 48 hours of a trial; you can subscribe after it expires. Annual prices are charged for the whole year, not in monthly instalments. The checkout identifies the currency, applicable taxes, billing amount and start date. Published subscription prices exclude applicable taxes unless expressly stated otherwise.",
          "Shario does not charge a transaction commission on your studio's customer payments. Stripe processing fees are separate from the Shario subscription and are payable under your Stripe agreement. Rates and other Stripe charges depend on your business country, payment method, currency conversion and account terms. Review Stripe's current pricing and your account agreement before accepting payments.",
          "Customer payments are processed through the studio's connected Stripe account. The studio is responsible for its customer sales, payment disputes, refunds, tax obligations and Stripe account requirements. Shario's software subscription is separate from the contract for a class, membership, booking or other service offered by the studio.",
          "If a subscription payment fails, access may be restricted. We will provide billing recovery information through the workspace or account contact. A pricing increase for an existing subscription will be notified at least 30 days in advance and will take effect no earlier than renewal, allowing you to cancel before it applies. This does not prevent legally required tax changes.",
        ],
      },
      {
        id: "cancellation-and-refunds",
        title: "5. Cancellation, plan changes and annual refunds",
        paragraphs: [
          "Cancel a paid subscription in billing settings before its renewal. Cancellation stops the next renewal and takes effect at the end of the current paid period; eligible paid access continues until then. You can withdraw a scheduled cancellation before it takes effect. Cancelling a card-free trial is immediate. Contact support promptly if you cannot access billing settings.",
          "Voluntary cancellation, unused time or unused allowances do not entitle a business customer to a refund of an already-paid monthly or annual subscription. In particular, cancelling an annual subscription does not automatically refund its remaining months. This rule is subject to mandatory law, any express written agreement and the remedies in these Terms.",
          "If we discontinue your paid service for convenience before the paid period ends, or you terminate because of our material breach that we fail to remedy within 30 days after written notice, we will refund the unused prepaid subscription portion from the effective termination date. No provision limits any refund, remedy or other right that applicable law does not allow us to exclude.",
          "The price and effective date of a plan change are shown before you confirm. On a paid subscription, moving to a higher plan takes effect immediately once any required payment is completed, with proration; moving to a lower plan takes effect at period end. Within the same plan, monthly-to-yearly billing is immediate once any required payment completes, and yearly-to-monthly billing starts next period. Changes during an active trial follow the displayed trial and billing dates. A cancellation or plan change does not itself create a refund or delete customer records.",
        ],
      },
      {
        id: "allowances-and-ai",
        title: "6. Usage allowances and AI",
        paragraphs: [
          "Email and AI allowances are shared within the workspace as described in the plan. Essential account messages and supported built-in operational emails are exempt from the metered automation-email allowance. When that allowance is exhausted, an affected metered automation email is skipped rather than automatically queued for the next month. Monitor usage and arrange a suitable plan for the volume you need.",
          "AI credits measure provider usage rather than a guaranteed number of questions or outcomes. Input, retrieved context, output and separate supported operations can affect consumption. A request requiring more credits than are available cannot run; Shario does not automatically bill AI overages. A displayed credit balance is not a promise of a particular answer quality or task count.",
          "AI features may send selected content and instructions to an AI provider. Use only data you are authorised to process and review the Privacy Policy. Outputs can be incomplete or incorrect. Check sources and results before relying on them; you remain responsible for decisions. Supported actions require confirmation. AI is not a substitute for professional advice or a safety-critical control system.",
        ],
      },
      {
        id: "studio-responsibilities",
        title: "7. Your customers, communications and physical studio",
        paragraphs: [
          "The studio determines its services, prices, booking and cancellation rules, customer terms and privacy notices. You are responsible for fulfilling bookings, handling customer complaints and refunds, obtaining required permissions and complying with local laws, including consumer, tax, accessibility, marketing and workplace obligations. These Terms do not replace your agreement with a studio customer.",
          "Send messages only where you have an appropriate lawful basis, honour opt-outs and keep recipient information accurate. You are responsible for content and instructions submitted by you or your team. Do not intentionally upload special-category personal data or highly sensitive identification or financial credentials unless a suitable written arrangement expressly permits that processing.",
          "Entry-code features distribute codes supplied by the studio. You provide, configure and maintain the access hardware, valid codes, safe premises, member eligibility and emergency procedures. Shario does not install or control your locks, operate equipment or guarantee the safety of independent visits. Do not rely on the service as the only way to manage a physical emergency.",
        ],
      },
      {
        id: "content-and-confidentiality",
        title: "8. Your content, our software and confidentiality",
        paragraphs: [
          "You retain rights in the content and records you submit. You grant us the limited rights needed to host, process, transmit and display that content to provide, support and secure the service under your instructions. You must have the necessary rights to provide it. We retain rights in Shario's software, designs and documentation and grant you access for your lawful internal business use during the subscription.",
          "Each party will protect the other's non-public business information with reasonable care, use it only for this agreement and disclose it only to people or service providers who need it and are bound by appropriate confidentiality obligations, or where law requires disclosure. Public information, independently developed information and information lawfully received from another source are excluded.",
          "We do not obtain a general right under these Terms to publish your private studio records, sell your customer lists or use your logo as an endorsement. Any public case study or testimonial requires a separate permission.",
        ],
      },
      {
        id: "suspension-and-ending",
        title: "9. Suspension, ending the service and data",
        paragraphs: [
          "We may proportionately restrict affected access where necessary to address non-payment, a serious security threat, unlawful use or a material breach. Where reasonably possible, we will explain the reason and allow correction before suspension; urgent action may be necessary to protect people, data or systems. Contact support to seek review. We will restore access when the reason is resolved.",
          "Either party may terminate for a material breach that is not remedied within 30 days after written notice, or immediately where the breach cannot reasonably be remedied or law requires it. We may stop offering the service at renewal by giving at least 30 days' notice. Earlier termination for our convenience carries the unused-period refund described above.",
          "Export the records available to you before your subscription ends, and contact us for assistance with additional data return or deletion. After restriction, general reporting and workspace exports may not remain accessible. Ending a subscription is not an instruction to erase every record automatically. Personal data processed for the studio is subject to the return/deletion provisions of the data processing addendum; our own legally required records follow the Privacy Policy.",
        ],
      },
      {
        id: "responsibility-and-liability",
        title: "10. Responsibility and limits of liability",
        paragraphs: [
          "We will provide the service with reasonable skill and care. You should keep appropriate copies of information essential to your business and review automated or AI-generated results. No software service can guarantee uninterrupted operation or prevent every error or unauthorised act.",
          "To the extent permitted by applicable law, neither party is liable for indirect or consequential losses that were not reasonably foreseeable when the agreement was made. Subject to the exceptions below, each party's aggregate liability arising from this agreement is limited to the subscription fees paid or payable for the 12 months before the event giving rise to the claim. Your obligation to pay agreed fees is not reduced by this cap.",
          "The exclusions and cap do not apply to fraud, wilful misconduct, gross negligence, death or personal injury caused by negligence, or any responsibility that cannot lawfully be excluded or limited. They do not limit a person's rights under applicable data-protection law or override mandatory small-business or consumer protections. Nothing in these Terms excludes or limits rights, remedies or liabilities that cannot lawfully be excluded or limited.",
        ],
      },
      {
        id: "law-changes-and-contact",
        title: "11. Governing law, changes and notices",
        paragraphs: [
          "Czech law governs this business agreement. Subject to any mandatory rule allowing or requiring another forum, the competent courts in Brno, Czech Republic, will hear disputes. This choice does not remove non-waivable protections or remedies that apply in your country. We encourage you to contact hello@shario.io first so we can try to resolve a concern.",
          "We will notify you of material changes to these Terms at least 30 days before they take effect. Changes that materially disadvantage you will apply no earlier than renewal unless required by law or necessary to address an urgent security issue. If you do not agree, you may cancel before they apply; if an adverse change must take effect during an existing prepaid period and you terminate because of it, we will refund the unused portion. We will explain shorter notice where unavoidable.",
          "Contractual notices may be sent to the account email and to hello@shario.io. These documents are provided in English; any convenience translation does not displace mandatory language or interpretation rights. If one provision is unenforceable, the remaining provisions continue to apply to the extent lawful. No failure to enforce a provision waives it permanently.",
        ],
      },
      {
        id: "data-processing-addendum",
        title: "12. Data processing addendum: scope and instructions",
        paragraphs: [
          "This addendum forms part of the agreement when we process personal data on the studio's behalf. The studio is the controller, or a processor authorised by its controller; Shario is its processor or subprocessor. For our own account administration, billing, security and business communications, we act as a controller as described in the Privacy Policy. Actual legal roles depend on each processing purpose.",
          "The subject is the provision, support and security of the subscribed studio-management service. Processing lasts for the service period and the period needed to return or delete data lawfully. Operations include collecting, organising, storing, retrieving, transmitting, updating, exporting and deleting records and, where enabled, generating AI assistance from authorised inputs.",
          "People concerned may include studio customers, members, prospective customers, employees, contractors and other authorised users. Data may include contact and account details, booking and membership records, order and invoice information, studio credit balances, communications, uploaded photos/files and operational records. The studio determines which lawful data is entered and the purposes of processing. Special-category data is not an intended input without a separate written arrangement.",
          "We process this data only on documented instructions in the agreement, workspace settings and lawful support requests, including instructions about transfers. If law requires other processing, we will inform you beforehand unless prohibited. We will promptly tell you if we believe an instruction infringes applicable data-protection law and may pause that instruction while it is resolved. You remain responsible for notices, lawful bases and instructions to us.",
        ],
      },
      {
        id: "data-security-and-assistance",
        title: "13. Data processing: confidentiality, security and assistance",
        paragraphs: [
          "We will ensure people authorised to process studio personal data are bound by confidentiality and receive access appropriate to their work. We will maintain technical and organisational measures appropriate to the risks, taking account of the nature of processing, available technology and applicable law, and will not materially reduce the overall protection during the agreement.",
          "The service's measures include tenant and permission checks, password hashing, protected production session cookies, encryption of stored communication credentials, and redaction of sensitive fields in structured logs. Access controls and processing boundaries must be maintained and reviewed as the service changes. These measures are not a claim of certification, EU-only hosting or encryption of every possible data store.",
          "We will notify the studio without undue delay after becoming aware of a personal-data breach affecting its data, provide available information needed to assess it and update that information as the investigation progresses. We will take reasonable steps to contain and remedy the incident. The studio decides any notices to individuals or authorities unless law requires us to notify directly.",
          "Taking account of the processing and information available to us, we will reasonably assist with individual-rights requests, security obligations, breach assessment, data-protection impact assessments and consultation with authorities. We will promptly pass on requests concerning studio-controlled data and will not independently answer them except on your instructions or where law requires. We will make compliance information available and allow proportionate audits or inspections by you or an independent auditor bound by confidentiality, with reasonable notice except for urgent incidents or regulatory requirements.",
        ],
      },
      {
        id: "subprocessors-and-transfers",
        title:
          "14. Data processing: service providers and international transfers",
        paragraphs: [
          "You generally authorise the categories of service providers described in the Privacy Policy where needed to supply the features you use. We must maintain a current subprocessor list identifying the applicable provider, service and processing locations and make it available on request. Customer-connected services that determine their own purposes, such as your payment provider, are governed by their applicable roles and agreements rather than automatically being our subprocessors.",
          "Before a subprocessor processes studio personal data, we must bind it to data-protection obligations providing at least the protection required of us for that processing. We remain responsible for its performance of those obligations. We will notify you at least 30 days before adding or replacing a subprocessor, allowing a reasonable data-protection objection. If we cannot resolve a justified objection with a reasonable alternative, you may terminate the affected service and receive a refund of the unused prepaid portion.",
          "Personal data may be processed outside the country of the studio or individual. A restricted transfer must not take place until the applicable legal requirements are met, including an adequacy decision or a valid transfer mechanism and any required supplementary measures. Where standard contractual clauses or a UK transfer instrument are required, the applicable instrument and completed annexes must be agreed before the affected transfer. This addendum does not by itself incorporate or replace those instruments. Contact hello@shario.io for the applicable locations, safeguards and contractual documentation.",
        ],
      },
      {
        id: "data-return-and-deletion",
        title: "15. Data processing: return and deletion",
        paragraphs: [
          "When processing services end, we will, at the studio's choice, return its personal data in a reasonable available format or delete it, and delete remaining copies unless applicable law requires storage. Contact hello@shario.io to give that instruction and arrange the scope and secure delivery. We will carry it out without undue delay, explain any technical staging or legally required retention, and confirm completion on request.",
          "Any data that must temporarily remain in protected backup or legal-retention systems must be isolated from ordinary use, remain protected under this addendum and be deleted when the applicable retention requirement ends. It must not be restored to ordinary processing except where necessary for recovery or law, with the deletion instruction reapplied as appropriate. Data we hold for our own lawful controller purposes follows the Privacy Policy.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    description:
      "How BNO Lab s.r.o. handles Shario account information, studio-directed data, service providers, AI, storage and privacy requests.",
    sections: [
      {
        id: "controller-and-contact",
        title: "1. Who is responsible for your information",
        paragraphs: [
          providerDetails,
          "We are the controller of personal information used for our own Shario account administration, subscription billing, security, service improvement and business communications. This notice explains those uses and the services involved. For customer and staff records a studio manages through Shario, the studio generally decides why and how the information is used and we process it on its instructions under the data processing addendum in our Terms.",
          "If you booked a class or use a studio's customer portal, consult that studio's privacy notice and contact the studio first about its records. We will help route a request to the appropriate studio where possible. You can contact hello@shario.io about our own processing or if you are unsure who to contact. Accepting the Terms does not provide blanket consent for optional marketing or unrelated personal-data use.",
        ],
      },
      {
        id: "information-and-sources",
        title: "2. Information we receive and where it comes from",
        paragraphs: [
          "We receive information you provide when registering, setting up a studio, using the service, subscribing or contacting support. We also receive information from authorised studio users, connected providers and technical interactions with the service. If a studio invites you or creates a record about you, that studio is the source of that information.",
        ],
        bullets: [
          "Account and business information: names, email addresses, phone numbers where supplied, studio and billing details, roles, account identifiers, login-provider identifiers and preferences. Passwords are stored as hashes rather than readable passwords.",
          "Studio-directed records: bookings, memberships, orders, invoices, credit balances, service and resource records, staff information, notes, photos, uploaded files and customer communications entered by the studio or its customers.",
          "Subscription and payment information: plan, billing period, payment status and Stripe identifiers. Stripe collects card-payment details in its payment flow; Shario uses the resulting payment and transaction information to operate the relevant workflow.",
          "Communications and support: messages, recipients, attachments, delivery and failure information and correspondence with support. Optional messaging integrations can include channel account identifiers, phone numbers, message/media content and delivery or read receipts.",
          "Technical and usage information: request and security logs, IP/network and device/browser information where generated, route/activity information, performance measurements and cookie or browser-storage preferences. AI inputs, selected context, outputs and usage records are processed when relevant AI features are used.",
        ],
      },
      {
        id: "purposes-and-bases",
        title: "3. Why we use information and our legal bases",
        paragraphs: [
          "Where the GDPR or similar rules apply, we use the legal basis appropriate to the purpose. We use account information to perform our contract with an individual business subscriber, or our legitimate interests in providing and administering the service for an organisation and its authorised users. Those interests include answering support requests, managing the business relationship and maintaining reliable studio software.",
          "We use subscription, billing and transaction records to perform the relevant contract, meet accounting, tax and other legal obligations, and establish or defend legal claims. Security and service logs are used for our legitimate interests in detecting misuse, protecting accounts and systems, diagnosing problems and improving reliability, subject to proportionate safeguards.",
          "Where consent is required for optional marketing, storage or another purpose, that activity must use the required consent mechanism. You can withdraw consent without affecting earlier lawful processing. Withdrawal does not prevent processing that has a separate lawful basis. We do not treat the signup agreement checkbox as consent to every optional use.",
          "For studio-directed personal data, we follow the studio's documented instructions; the studio is responsible for identifying its lawful basis and informing the people concerned. We do not use that role to decide a new, unrelated purpose for customer records.",
        ],
      },
      {
        id: "service-providers",
        title: "4. Who can receive information",
        paragraphs: [
          "Access is limited to people and providers who need the information for the relevant purpose, subject to appropriate contractual or legal duties. Depending on the enabled features and configuration, Shario uses infrastructure, storage, payment, email, authentication, analytics, support and AI services. Not every optional integration applies to every studio.",
          "The implemented services include Vercel for frontend hosting, analytics and performance measurement; Render for application services; database and queue hosting; Cloudflare R2 for file storage; Postmark or a configured SMTP provider for email; and OpenAI or a configured AI gateway for AI features. Google or Apple may handle an enabled sign-in option. Optional Meta WhatsApp or Instagram integrations transmit the information needed for the chosen messaging channel.",
          "Stripe processes payment information under its applicable agreement and privacy notice. A studio may connect its own payment, email or messaging account; such a provider can act separately from Shario for its own purposes. Review the notices of providers you choose. Contact hello@shario.io for the current provider list, applicable services and processing locations for your setup.",
          "We may disclose information to professional advisers or authorities where necessary to comply with law or establish, exercise or defend rights. In a business reorganisation, information may be transferred with safeguards and appropriate notice; it must remain subject to the applicable privacy obligations. We do not obtain a general permission from this notice to publish a studio's private records or customer list.",
        ],
      },
      {
        id: "ai-processing",
        title: "5. AI features",
        paragraphs: [
          "When an AI feature is enabled and used, the relevant prompt, selected studio context, uploaded or spoken content where supported, and instructions may be sent to the configured AI provider for responses, moderation, embeddings or transcription. Shario processes outputs and usage records to deliver the feature and enforce allowances. Access to studio context is filtered by the feature and user permissions.",
          "Customer-facing concierge features are designed not to add private customer-account, booking or payment records to their model context. A person can nevertheless include personal information in a message, so do not submit information you are not authorised to share. Provider handling and retention depend on the service, agreement and settings; this notice does not promise zero retention, EU-only AI processing or that every configured provider has identical training terms.",
          "AI provides assistance rather than a guaranteed answer. Staff should review results and sources, and supported actions require confirmation. The described assistant features are not intended to make solely automated decisions with legal or similarly significant effects about people. A studio remains responsible for how it uses outputs and for any additional notice required for its own use.",
        ],
      },
      {
        id: "cookies-and-analytics",
        title: "6. Cookies, browser storage and analytics",
        paragraphs: [
          "Shario uses cookies and browser storage for authentication, security, language selection, a remembered workspace and in-progress workflows. Their lifetimes depend on the purpose; some are session-based and saved preferences can persist across visits. Clearing or blocking required storage can sign you out or prevent a requested feature from working.",
          "Vercel Web Analytics and Speed Insights are integrated for usage and performance information. They are separate from the information needed to authenticate you. Their operation and data handling are described by Vercel; local requirements for non-essential storage or tracking must be respected. This Privacy Policy is a disclosure, not a substitute for consent where consent is required.",
          "You can manage browser storage through your browser settings and use available preference controls. For questions about a particular measurement or opt-out request, contact hello@shario.io. A studio's own external website or connected marketing tools can have separate storage and tracking practices.",
        ],
      },
      {
        id: "international-processing",
        title: "7. International processing",
        paragraphs: [
          "Shario is operated from the Czech Republic and serves studios internationally. Providers and authorised support access can involve processing outside your country, including outside the EEA or UK. We do not represent that all data remains in one country merely because an application server is hosted there.",
          "Where a transfer is restricted by applicable data-protection law, the required safeguard must be in place before that transfer: for example, an applicable adequacy decision or properly completed contractual transfer clauses with any required supplementary measures. UK requirements may require a separate approved instrument or addendum. Ask hello@shario.io for the applicable countries, safeguards and a copy or description of the relevant protection, subject to lawful redactions.",
        ],
      },
      {
        id: "retention",
        title: "8. How long information is kept",
        paragraphs: [
          "We determine retention by the purpose and category of the information: whether the account or service relationship continues, whether the information is needed for the studio's instructions, applicable accounting or other legal duties, unresolved disputes and limitation periods, security needs and a verified deletion request. Information should not be retained merely because storage is available. Contact us for the applicable retention information for a particular record or workspace.",
          "Trial expiry or subscription cancellation does not automatically erase studio records. Some account recovery and existing-customer workflows remain available while general workspace features are restricted. This is not a promise of indefinite storage or a guaranteed recovery period. Arrange an export before expiry where possible, or contact support for assistance with return or deletion.",
          "Studio-controlled personal data follows the studio's instructions and the return/deletion obligations in the data processing addendum. Where law requires us to retain our own billing, security or dispute records, we limit use to that purpose and retain them for the applicable requirement. Residual backup copies, where present, must remain protected and isolated from ordinary use pending deletion or expiry of the applicable backup retention.",
        ],
      },
      {
        id: "security",
        title: "9. Protecting information",
        paragraphs: [
          "Shario uses access and tenant-permission controls, password hashing, protected production session cookies, encryption of stored communication credentials and sensitive-field redaction in structured logs. People with access must use it for their authorised work. The appropriate measures depend on the processing and must be maintained as risks and the service change.",
          "No system is risk-free. Protect your credentials, keep user access appropriate and report suspected unauthorised access to hello@shario.io. This notice does not claim a certification, a particular backup guarantee or encryption of every field in every data store.",
        ],
      },
      {
        id: "your-rights",
        title: "10. Your choices, rights and complaints",
        paragraphs: [
          "Depending on applicable law and the circumstances, you may request access, correction, erasure, restriction, a portable copy, or object to processing, including processing based on legitimate interests and direct marketing. Where processing relies on consent, you may withdraw it. Some requests are subject to legal exceptions or the rights of others; we will explain a refusal or limitation where required.",
          "Send requests about our controller processing to hello@shario.io. We may request proportionate information to verify identity and authority. We will handle requests within the deadlines applicable to the request and explain any permitted extension. Rights requests are generally free; any lawful exception will be explained. A request about a studio's customer records will normally need to be handled by that studio, with our assistance as processor.",
          "You may complain to a competent data-protection authority, including the Czech Office for Personal Data Protection (Úřad pro ochranu osobních údajů, uoou.gov.cz). Under applicable law, you may also contact the authority where you live or work or where an alleged infringement occurred. Contacting us first is welcome but is not a condition for exercising that right.",
          "Account information necessary to create and secure a workspace, supply the selected service or meet a legal requirement must be provided for that purpose; without it we may be unable to provide the relevant feature. Optional information and integrations are not required simply to browse the public site.",
        ],
      },
      {
        id: "children-and-updates",
        title: "11. Children, changes and further information",
        paragraphs: [
          "Business workspace accounts are intended for adults authorised to act for a studio. A studio that offers activities to children must determine the information it can lawfully collect, provide suitable notices and obtain any required parental or other permission. Do not create a business account on behalf of a child.",
          "We may update this notice as the service, processing or legal requirements change. The version and last-updated date identify the document. We will provide appropriate notice of material changes; where a new purpose requires consent, an updated notice alone does not supply that consent. Questions can be sent to hello@shario.io.",
        ],
      },
    ],
  },
});
