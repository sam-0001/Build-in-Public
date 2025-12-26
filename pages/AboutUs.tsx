import React, { useEffect } from 'react';

export const AboutUs: React.FC = () => {
  useEffect(() => {
    document.title = "About Us | Build in Public – Engineers";
  }, []);

  return (
    <div className="min-h-screen bg-white py-16 px-4 sm:px-6 lg:px-8 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto space-y-10">
        
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          About Build in Public – Engineers
        </h1>

        <div className="prose prose-lg text-gray-700 space-y-6">
          <p className="text-xl leading-relaxed">
            <strong>Build in Public – Engineers</strong> is a learning platform and community built specifically for engineering students who want to move beyond passive studying. We believe that the best way to master complex engineering concepts is by documenting the journey, sharing progress, and learning openly.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8">Why We Exist</h2>
          <p>
            Engineering education often feels isolated. Students prepare for exams in silos, struggling with similar problems without a network of support. <strong>Build in Public – Engineers</strong> exists to change that dynamic. By encouraging transparency and consistency, we help students track their growth and build confidence in their technical abilities.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8">Our Approach</h2>
          <p>
            We combine traditional academic rigor with modern learning habits. Whether you are preparing for SPPU exams or developing new technical skills, our platform encourages you to:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Access structured, exam-oriented courses and notes.</li>
            <li>Commit to consistent study schedules.</li>
            <li>Share your learnings and setbacks to foster genuine growth.</li>
          </ul>
          <p>
            This isn't just about passing exams; it is about building the discipline required for a successful engineering career. <strong>Build in Public – Engineers</strong> provides the resources and the environment to make that happen.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8">Learning Through Transparency</h2>
          <p>
            When you build in public, you create a feedback loop that accelerates learning. You become accountable to yourself and your peers. <strong>Build in Public – Engineers</strong> supports this philosophy by offering tools and content that value real progress over perfection.
          </p>
        </div>

        <section className="pt-8 border-t border-gray-100 mt-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
          <p className="text-lg text-gray-700">
            For questions, support, or collaboration, contact us at:<br />
            <a href="mailto:buildinpublicengineers@gmail.com" className="text-brand-600 hover:underline font-medium">
              buildinpublicengineers@gmail.com
            </a>
          </p>
        </section>

      </div>
    </div>
  );
};