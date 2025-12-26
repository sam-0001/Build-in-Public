import React, { useEffect } from 'react';

export const BuildInPublicEngineers: React.FC = () => {
  useEffect(() => {
    document.title = "Build in Public Engineers | Engineering Students Community";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', "Build in Public Engineers is a student-led engineering community where learners build in public, share progress, and grow skills together.");
    } else {
      const meta = document.createElement('meta');
      meta.name = "description";
      meta.content = "Build in Public Engineers is a student-led engineering community where learners build in public, share progress, and grow skills together.";
      document.head.appendChild(meta);
    }
  }, []);

  return (
    <div className="min-h-screen bg-white py-16 px-4 sm:px-6 lg:px-8 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto space-y-12">
        
        {/* H1 */}
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
          Build in Public Engineers
        </h1>

        {/* Introduction */}
        <p className="text-xl leading-relaxed text-gray-700">
          <strong>Build in Public Engineers</strong> is a student-led engineering community designed to help learners document their journey openly. By sharing progress, mistakes, and achievements, <strong>Build in Public Engineers</strong> fosters transparency and collective growth among aspiring engineers.
        </p>

        {/* What Build in Public Means */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">What Build in Public Means for Engineers</h2>
          <p className="text-lg leading-relaxed text-gray-700">
            The concept of building in public involves sharing the process of creation and learning rather than just the final result. For <strong>Build in Public Engineers</strong>, this means documenting the day-to-day realities of engineering studies, from solving complex problems to overcoming academic challenges. It shifts the focus from perfection to consistency.
          </p>
        </section>

        {/* Who It Is For */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Who Build in Public Engineers Is For</h2>
          <p className="text-lg leading-relaxed text-gray-700">
            This platform is dedicated to:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-lg text-gray-700">
            <li>Engineering students (FE to BE) across various disciplines.</li>
            <li>Students preparing for exams and developing technical skills together.</li>
            <li>Learners who value transparency and want to build a consistent habit of sharing their work.</li>
          </ul>
          <p className="text-lg leading-relaxed text-gray-700">
            <strong>Build in Public Engineers</strong> connects individuals who believe in growing through shared experiences.
          </p>
        </section>

        {/* What We Build */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">What We Build and Share Publicly</h2>
          <p className="text-lg leading-relaxed text-gray-700">
            Our community focuses on sharing:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-lg text-gray-700">
            <li>Exam preparation journeys and study techniques.</li>
            <li>Engineering notes, academic resources, and reference materials.</li>
            <li>Technical projects, coding experiments, and practical implementations.</li>
            <li>Personal learnings, improvements, and retrospective insights.</li>
          </ul>
        </section>

        {/* Why Exists */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Why Build in Public Engineers Exists</h2>
          <p className="text-lg leading-relaxed text-gray-700">
            <strong>Build in Public Engineers</strong> exists to break the isolation often felt during engineering studies. Instead of struggling in private, students can leverage the power of community to find motivation and support. The goal is to create an environment where learning is visible, accessible, and collaborative for everyone involved.
          </p>
        </section>

        {/* Contact */}
        <section className="space-y-4 pt-8 border-t border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">Contact</h2>
          <p className="text-lg leading-relaxed text-gray-700">
            For questions, collaboration, or community participation, contact:<br />
            <a href="mailto:buildinpublicengineers@gmail.com" className="text-brand-600 hover:underline font-medium">buildinpublicengineers@gmail.com</a>
          </p>
        </section>

      </div>
    </div>
  );
};