import React from 'react';
import { 
  Target, 
  Download, 
  Cloud, 
  Zap, 
  Shield, 
  FileText, 
  Smartphone, 
  Globe, 
  CheckCircle, 
  ArrowRight,
  Star,
  Users,
  Bookmark,
  Search,
  Tag,
  BarChart3,
  Rss,
  Mail,
  Eye,
  Trash2
} from 'lucide-react';
import BrutalCard from './BrutalCard';
import BrutalButton from './BrutalButton';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const features = [
    {
      icon: <Target className="w-8 h-8 text-white" />,
      title: "Clean Content Extraction",
      description: "Removes ads, popups, and clutter to give you pure, readable content from any website.",
      benefit: "Save time and focus on what matters"
    },
    {
      icon: <Cloud className="w-8 h-8 text-white" />,
      title: "Cloud Storage Integration",
      description: "Automatically saves articles to your WebDAV storage with smart organization and metadata.",
      benefit: "Access your library from anywhere"
    },
    {
      icon: <Tag className="w-8 h-8 text-white" />,
      title: "AI-Powered Tagging",
      description: "Automatically categorizes and tags your articles using advanced AI for easy discovery.",
      benefit: "Find articles instantly with smart search"
    },
    {
      icon: <FileText className="w-8 h-8 text-white" />,
      title: "Self-Contained Archives",
      description: "Creates complete HTML files with embedded images - no broken links or missing content.",
      benefit: "Your articles stay perfect forever"
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-white" />,
      title: "Source Analysis",
      description: "Analyzes your reading habits and discovers RSS feeds and newsletters from your favorite sites.",
      benefit: "Never miss content from sources you love"
    },
    {
      icon: <Smartphone className="w-8 h-8 text-white" />,
      title: "Bulk Import Tools",
      description: "Import your entire Pocket library or reading lists with one click - no manual work required.",
      benefit: "Migrate your reading history effortlessly"
    }
  ];

  const useCases = [
    {
      icon: <Bookmark className="w-6 h-6 text-blue-600" />,
      title: "Research & Study",
      description: "Save academic papers, tutorials, and reference materials with perfect formatting and searchable tags.",
      audience: "Students & Researchers"
    },
    {
      icon: <Globe className="w-6 h-6 text-green-600" />,
      title: "News & Current Events",
      description: "Archive important news articles before they disappear or get paywalled. Build your personal news library.",
      audience: "Journalists & News Readers"
    },
    {
      icon: <Users className="w-6 h-6 text-purple-600" />,
      title: "Professional Development",
      description: "Collect industry insights, best practices, and career advice. Organize by topics and skills.",
      audience: "Professionals & Entrepreneurs"
    },
    {
      icon: <Star className="w-6 h-6 text-yellow-600" />,
      title: "Personal Interests",
      description: "Save recipes, DIY guides, travel articles, and hobby content. Create your personal knowledge base.",
      audience: "Hobbyists & Enthusiasts"
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Paste Any URL",
      description: "Copy a link from any website - news articles, blog posts, tutorials, or research papers.",
      icon: <Target className="w-6 h-6 text-red-600" />
    },
    {
      number: "2",
      title: "AI Does the Work",
      description: "Our system extracts clean content, removes ads, embeds images, and adds smart tags automatically.",
      icon: <Zap className="w-6 h-6 text-yellow-600" />
    },
    {
      number: "3",
      title: "Perfect Archive Created",
      description: "Get a beautiful, self-contained HTML file that works forever - no broken links or missing images.",
      icon: <CheckCircle className="w-6 h-6 text-green-600" />
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 border-4 border-red-500 rotate-45 opacity-20"></div>
        <div className="absolute top-32 right-20 w-16 h-16 bg-yellow-400 rotate-12 opacity-30"></div>
        <div className="absolute bottom-20 left-1/4 w-24 h-24 border-4 border-blue-600 opacity-25"></div>
        <div className="absolute top-1/2 right-10 w-12 h-12 bg-red-500 rotate-45 opacity-40"></div>
        <div className="absolute bottom-32 right-1/3 w-8 h-8 bg-black opacity-60"></div>
        <div className="absolute top-20 left-1/2 w-6 h-6 bg-yellow-400 rotate-45"></div>
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            {/* Logo */}
            <div className="w-24 h-24 bg-black border-4 border-red-500 flex items-center justify-center mx-auto mb-8 transform rotate-12 hover:rotate-0 transition-transform duration-300">
              <Target className="w-12 h-12 text-red-500" />
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-black text-black uppercase tracking-wider transform skew-x-neg5 mb-6">
              WEB RIPPER
            </h1>
            
            <h2 className="text-2xl md:text-3xl font-black text-red-600 uppercase tracking-widest mb-8">
              CONTENT DESTROYER
            </h2>

            {/* Value Proposition */}
            <p className="text-xl md:text-2xl font-bold text-gray-800 mb-4 leading-relaxed">
              Turn any webpage into a <span className="text-red-600 font-black">perfect archive</span> in seconds.
            </p>
            
            <p className="text-lg font-bold text-gray-700 mb-12 max-w-2xl mx-auto">
              No more broken links, missing images, or cluttered ads. 
              Just clean, beautiful content that lasts forever.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <BrutalButton
                onClick={onGetStarted}
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
              >
                <Zap className="w-6 h-6" />
                START DESTROYING ADS
              </BrutalButton>
              
              <BrutalButton
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                <Eye className="w-6 h-6" />
                SEE HOW IT WORKS
              </BrutalButton>
            </div>

            {/* Social Proof */}
            <div className="bg-white border-4 border-black p-6 inline-block">
              <div className="flex items-center justify-center gap-8 text-center">
                <div>
                  <div className="text-2xl font-black text-black">100%</div>
                  <div className="text-sm font-bold text-gray-600 uppercase">Ad-Free</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-black">∞</div>
                  <div className="text-sm font-bold text-gray-600 uppercase">Websites</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-black">0</div>
                  <div className="text-sm font-bold text-gray-600 uppercase">Broken Links</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="bg-red-100 border-t-4 border-b-4 border-black py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl font-black text-black uppercase mb-8">
                TIRED OF THIS GARBAGE?
              </h2>
              
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <BrutalCard className="bg-red-200 border-red-600">
                  <div className="text-center p-4">
                    <div className="w-16 h-16 bg-red-600 border-4 border-black flex items-center justify-center mx-auto mb-4">
                      <Trash2 className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-black text-black text-lg uppercase mb-2">ADS EVERYWHERE</h3>
                    <p className="text-sm font-bold text-gray-700">
                      Popups, banners, and sponsored content destroying your reading experience.
                    </p>
                  </div>
                </BrutalCard>

                <BrutalCard className="bg-red-200 border-red-600">
                  <div className="text-center p-4">
                    <div className="w-16 h-16 bg-red-600 border-4 border-black flex items-center justify-center mx-auto mb-4">
                      <Globe className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-black text-black text-lg uppercase mb-2">BROKEN LINKS</h3>
                    <p className="text-sm font-bold text-gray-700">
                      Articles disappear, images break, and your saved bookmarks become useless.
                    </p>
                  </div>
                </BrutalCard>

                <BrutalCard className="bg-red-200 border-red-600">
                  <div className="text-center p-4">
                    <div className="w-16 h-16 bg-red-600 border-4 border-black flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-black text-black text-lg uppercase mb-2">CAN'T FIND ANYTHING</h3>
                    <p className="text-sm font-bold text-gray-700">
                      Thousands of bookmarks with no organization, tags, or way to search.
                    </p>
                  </div>
                </BrutalCard>
              </div>

              <p className="text-xl font-black text-red-800 uppercase">
                WEB RIPPER DESTROYS ALL OF THIS NONSENSE
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-black text-black uppercase text-center mb-4">
                HOW IT WORKS
              </h2>
              <p className="text-lg font-bold text-gray-700 text-center mb-12">
                Three simple steps to perfect content archives
              </p>

              <div className="space-y-8">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-black border-4 border-yellow-400 flex items-center justify-center text-white font-black text-2xl">
                        {step.number}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="bg-white border-4 border-black p-6">
                        <div className="flex items-center gap-3 mb-3">
                          {step.icon}
                          <h3 className="text-xl font-black text-black uppercase">{step.title}</h3>
                        </div>
                        <p className="text-lg font-bold text-gray-700">{step.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-gray-200 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-black text-black uppercase text-center mb-4">
                BRUTAL FEATURES
              </h2>
              <p className="text-lg font-bold text-gray-700 text-center mb-12">
                Everything you need to build the perfect content library
              </p>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature, index) => (
                  <BrutalCard key={index} hover className="h-full">
                    <div className="p-6 h-full flex flex-col">
                      <div className="w-16 h-16 bg-black border-4 border-yellow-400 flex items-center justify-center mb-4">
                        {feature.icon}
                      </div>
                      <h3 className="text-lg font-black text-black uppercase mb-3">{feature.title}</h3>
                      <p className="text-sm font-bold text-gray-700 mb-4 flex-1">{feature.description}</p>
                      <div className="bg-green-100 border-2 border-green-500 p-3">
                        <p className="text-xs font-black text-green-800 uppercase">{feature.benefit}</p>
                      </div>
                    </div>
                  </BrutalCard>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-black text-black uppercase text-center mb-4">
                WHO USES WEB RIPPER?
              </h2>
              <p className="text-lg font-bold text-gray-700 text-center mb-12">
                Perfect for anyone who reads content online
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                {useCases.map((useCase, index) => (
                  <BrutalCard key={index} hover>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        {useCase.icon}
                        <div>
                          <h3 className="text-lg font-black text-black uppercase">{useCase.title}</h3>
                          <p className="text-sm font-bold text-gray-600 uppercase">{useCase.audience}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-gray-700">{useCase.description}</p>
                    </div>
                  </BrutalCard>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Advanced Features */}
        <section className="bg-blue-100 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-black text-black uppercase text-center mb-12">
                ADVANCED TOOLS
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                <BrutalCard className="bg-green-50 border-green-500">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Rss className="w-8 h-8 text-green-600" />
                      <h3 className="text-xl font-black text-black uppercase">Source Discovery</h3>
                    </div>
                    <p className="text-sm font-bold text-gray-700 mb-4">
                      Automatically finds RSS feeds and newsletter signups from websites you save. 
                      Never miss new content from your favorite sources.
                    </p>
                    <div className="bg-green-200 border-2 border-green-600 p-3">
                      <p className="text-xs font-black text-green-800 uppercase">
                        ✓ Auto-discover RSS feeds ✓ Find newsletter signups ✓ Track reading habits
                      </p>
                    </div>
                  </div>
                </BrutalCard>

                <BrutalCard className="bg-purple-50 border-purple-500">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Download className="w-8 h-8 text-purple-600" />
                      <h3 className="text-xl font-black text-black uppercase">Bulk Import</h3>
                    </div>
                    <p className="text-sm font-bold text-gray-700 mb-4">
                      Import your entire Pocket library, browser bookmarks, or reading lists. 
                      Supports JSON, CSV, and HTML export formats.
                    </p>
                    <div className="bg-purple-200 border-2 border-purple-600 p-3">
                      <p className="text-xs font-black text-purple-800 uppercase">
                        ✓ Pocket import ✓ Browser bookmarks ✓ Batch processing
                      </p>
                    </div>
                  </div>
                </BrutalCard>

                <BrutalCard className="bg-yellow-50 border-yellow-500">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Eye className="w-8 h-8 text-yellow-600" />
                      <h3 className="text-xl font-black text-black uppercase">Source Management</h3>
                    </div>
                    <p className="text-sm font-bold text-gray-700 mb-4">
                      Hide sources you don't want to see, organize by quality, and focus on 
                      content that matters to you. Clean up your reading experience.
                    </p>
                    <div className="bg-yellow-200 border-2 border-yellow-600 p-3">
                      <p className="text-xs font-black text-yellow-800 uppercase">
                        ✓ Hide unwanted sources ✓ Quality filtering ✓ Clean organization
                      </p>
                    </div>
                  </div>
                </BrutalCard>

                <BrutalCard className="bg-red-50 border-red-500">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Trash2 className="w-8 h-8 text-red-600" />
                      <h3 className="text-xl font-black text-black uppercase">CSS Cleanup</h3>
                    </div>
                    <p className="text-sm font-bold text-gray-700 mb-4">
                      Remove all styling from existing archives to create clean, uniform content. 
                      Perfect for academic research and professional documentation.
                    </p>
                    <div className="bg-red-200 border-2 border-red-600 p-3">
                      <p className="text-xs font-black text-red-800 uppercase">
                        ✓ Remove all CSS ✓ Uniform formatting ✓ Academic-ready
                      </p>
                    </div>
                  </div>
                </BrutalCard>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Benefits */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-black text-black uppercase text-center mb-12">
                TECHNICAL SUPERIORITY
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-black text-black uppercase mb-1">Self-Contained Archives</h4>
                      <p className="text-sm font-bold text-gray-700">
                        Every image is embedded as base64 data. No external dependencies, no broken links.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-black text-black uppercase mb-1">WebDAV Integration</h4>
                      <p className="text-sm font-bold text-gray-700">
                        Works with any WebDAV server. Your data stays under your control.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-black text-black uppercase mb-1">Smart Content Detection</h4>
                      <p className="text-sm font-bold text-gray-700">
                        Advanced algorithms identify main content and remove navigation, ads, and clutter.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-black text-black uppercase mb-1">AI-Powered Tagging</h4>
                      <p className="text-sm font-bold text-gray-700">
                        Automatic categorization and tagging using OpenAI for perfect organization.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-black text-black uppercase mb-1">Metadata Preservation</h4>
                      <p className="text-sm font-bold text-gray-700">
                        Saves extraction date, source URL, word count, and custom tags for every article.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-black text-black uppercase mb-1">Anonymous Mode</h4>
                      <p className="text-sm font-bold text-gray-700">
                        Works without registration. Create an account only when you want cloud features.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-black text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl font-black uppercase mb-6">
                STOP LOSING CONTENT
              </h2>
              
              <p className="text-xl font-bold mb-8">
                Start building your perfect content library today. 
                No ads, no broken links, no bullshit.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                <BrutalButton
                  onClick={onGetStarted}
                  variant="danger"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <Target className="w-6 h-6" />
                  DESTROY YOUR FIRST WEBPAGE
                </BrutalButton>
              </div>

              <div className="bg-gray-900 border-4 border-red-500 p-6 inline-block">
                <p className="text-sm font-bold text-gray-300 uppercase">
                  ✓ Free to use ✓ No registration required ✓ Works on any website
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LandingPage;