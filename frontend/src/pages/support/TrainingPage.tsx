import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trainingApi } from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
import {
  AcademicCapIcon,
  BookOpenIcon,
  PlayCircleIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ClockIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

interface TrainingCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  content_count: number;
}

interface TrainingContent {
  id: string;
  category: string;
  category_name: string;
  title: string;
  slug: string;
  description: string;
  content_type: string;
  content_type_display: string;
  thumbnail: string | null;
  reading_time: number | null;
  video_duration: number | null;
  is_featured: boolean;
  view_count: number;
  is_completed: boolean;
  published_at: string;
}


const CONTENT_TYPE_ICONS: Record<string, React.ElementType> = {
  ARTICLE: DocumentTextIcon,
  GUIDE: BookOpenIcon,
  VIDEO: PlayCircleIcon,
  FAQ: QuestionMarkCircleIcon,
};

const CONTENT_TYPE_COLORS: Record<string, string> = {
  ARTICLE: 'bg-blue-100 text-blue-700',
  GUIDE: 'bg-emerald-100 text-emerald-700',
  VIDEO: 'bg-purple-100 text-purple-700',
  FAQ: 'bg-amber-100 text-amber-700',
};

export default function TrainingPage() {
  const queryClient = useQueryClient();
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState('');

  // Fetch categories
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['training-categories'],
    queryFn: async () => {
      const response = await trainingApi.listCategories();
      return response.data;
    },
  });

  // Fetch content
  const { data: contentList, isLoading: loadingContent } = useQuery({
    queryKey: ['training-content', selectedCategory, contentTypeFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (selectedCategory) params.category = selectedCategory;
      if (contentTypeFilter) params.content_type = contentTypeFilter;
      const response = await trainingApi.listContent(params);
      return response.data;
    },
  });

  // Fetch content detail
  const { data: contentDetail } = useQuery({
    queryKey: ['training-content-detail', selectedContent],
    queryFn: async () => {
      if (!selectedContent) return null;
      const response = await trainingApi.getContent(selectedContent);
      return response.data;
    },
    enabled: !!selectedContent,
  });

  // Fetch progress summary
  const { data: progressSummary } = useQuery({
    queryKey: ['training-progress-summary'],
    queryFn: async () => {
      const response = await trainingApi.getProgressSummary();
      return response.data;
    },
  });

  // Mark complete mutation
  const markComplete = useMutation({
    mutationFn: (slug: string) => trainingApi.markComplete(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-content'] });
      queryClient.invalidateQueries({ queryKey: ['training-content-detail', selectedContent] });
      queryClient.invalidateQueries({ queryKey: ['training-progress-summary'] });
    },
  });

  const contentArray = contentList?.results || contentList || [];
  const filteredContent = Array.isArray(contentArray) 
    ? contentArray.filter((content: TrainingContent) =>
        content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        content.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <FadeIn duration={400}>
      <div className="space-y-6 relative">
        {/* Coming Soon Overlay */}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
          <div className="text-center p-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center">
              <AcademicCapIcon className="w-10 h-10 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Disponible prochainement</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Le centre de formation est en cours de développement. 
              Vous pourrez bientôt accéder à des guides, tutoriels et ressources 
              pour maîtriser le système Tax Free.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-xl text-sm font-medium">
              <ClockIcon className="w-4 h-4" />
              En cours de développement
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pointer-events-none opacity-50">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centre de formation</h1>
          <p className="text-gray-500 mt-1">
            Guides, tutoriels et ressources pour maîtriser le système Tax Free
          </p>
        </div>
      </div>

      {/* Progress Summary */}
      {progressSummary && (
        <div className="bg-gradient-to-r from-primary-500 to-primary-700 rounded-xl p-6 text-white pointer-events-none opacity-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-1">Votre progression</h2>
              <p className="text-primary-100">
                {progressSummary.completed} sur {progressSummary.total_content} contenus complétés
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{progressSummary.completion_rate}%</div>
              <p className="text-primary-100 text-sm">Taux de complétion</p>
            </div>
          </div>
          <div className="mt-4 bg-white/20 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all"
              style={{ width: `${progressSummary.completion_rate}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6 pointer-events-none opacity-50">
        {/* Sidebar - Categories */}
        <div className="col-span-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Catégories</h3>
            
            {loadingCategories ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    !selectedCategory ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">Tous les contenus</span>
                </button>
                {(Array.isArray(categories) ? categories : []).map((category: TrainingCategory) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.slug)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === category.slug ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{category.name}</span>
                      <span className="text-xs text-gray-400">{category.content_count}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content Type Filter */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mt-4">
            <h3 className="font-semibold text-gray-900 mb-4">Type de contenu</h3>
            <div className="space-y-1">
              {[
                { value: '', label: 'Tous', icon: AcademicCapIcon },
                { value: 'ARTICLE', label: 'Articles', icon: DocumentTextIcon },
                { value: 'GUIDE', label: 'Guides', icon: BookOpenIcon },
                { value: 'VIDEO', label: 'Vidéos', icon: PlayCircleIcon },
                { value: 'FAQ', label: 'FAQ', icon: QuestionMarkCircleIcon },
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setContentTypeFilter(type.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    contentTypeFilter === type.value ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50'
                  }`}
                >
                  <type.icon className="w-4 h-4" />
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content List or Detail */}
        <div className="col-span-9">
          {selectedContent && contentDetail ? (
            /* Content Detail View */
            <div className="bg-white rounded-xl border border-gray-200">
              {/* Back button */}
              <div className="p-4 border-b border-gray-200">
                <button
                  onClick={() => setSelectedContent(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  ← Retour à la liste
                </button>
              </div>

              {/* Content Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${CONTENT_TYPE_COLORS[contentDetail.content_type]}`}>
                        {contentDetail.content_type_display}
                      </span>
                      <span className="text-sm text-gray-500">{contentDetail.category?.name}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{contentDetail.title}</h2>
                    <p className="text-gray-500 mt-2">{contentDetail.description}</p>
                    <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
                      {contentDetail.reading_time && (
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-4 h-4" />
                          {contentDetail.reading_time} min de lecture
                        </span>
                      )}
                      {contentDetail.video_duration && (
                        <span className="flex items-center gap-1">
                          <PlayCircleIcon className="w-4 h-4" />
                          {formatDuration(contentDetail.video_duration)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <EyeIcon className="w-4 h-4" />
                        {contentDetail.view_count} vues
                      </span>
                    </div>
                  </div>
                  
                  {contentDetail.user_progress?.is_completed ? (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircleSolidIcon className="w-6 h-6" />
                      <span className="font-medium">Complété</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => markComplete.mutate(contentDetail.slug)}
                      disabled={markComplete.isPending}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      Marquer comme lu
                    </button>
                  )}
                </div>
              </div>

              {/* Video Player */}
              {contentDetail.content_type === 'VIDEO' && contentDetail.video_url && (
                <div className="p-6 border-b border-gray-200">
                  <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                    <iframe
                      src={contentDetail.video_url.replace('watch?v=', 'embed/')}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Content Body */}
              <div className="p-6">
                <div
                  className="prose prose-gray max-w-none"
                  dangerouslySetInnerHTML={{ __html: contentDetail.body }}
                />
              </div>
            </div>
          ) : (
            /* Content List View */
            <>
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un contenu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Content Grid */}
              {loadingContent ? (
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                      <div className="h-32 bg-gray-100 rounded-lg mb-4" />
                      <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredContent.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <AcademicCapIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">Aucun contenu trouvé</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {filteredContent.map((content: TrainingContent) => {
                    const Icon = CONTENT_TYPE_ICONS[content.content_type] || DocumentTextIcon;
                    return (
                      <button
                        key={content.id}
                        onClick={() => setSelectedContent(content.slug)}
                        className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-primary-300 hover:shadow-md transition-all group"
                      >
                        {/* Thumbnail or Icon */}
                        <div className="h-32 bg-gray-100 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                          {content.thumbnail ? (
                            <img
                              src={content.thumbnail}
                              alt={content.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Icon className="w-12 h-12 text-gray-300" />
                          )}
                          {content.is_completed && (
                            <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full">
                              <CheckCircleIcon className="w-4 h-4" />
                            </div>
                          )}
                          {content.is_featured && (
                            <div className="absolute top-2 left-2 bg-amber-500 text-white px-2 py-0.5 rounded text-xs font-medium">
                              ⭐ Recommandé
                            </div>
                          )}
                        </div>

                        {/* Content Info */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${CONTENT_TYPE_COLORS[content.content_type]}`}>
                            {content.content_type_display}
                          </span>
                          <span className="text-xs text-gray-400">{content.category_name}</span>
                        </div>
                        
                        <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                          {content.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{content.description}</p>
                        
                        <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            {content.reading_time && (
                              <>
                                <ClockIcon className="w-3 h-3" />
                                {content.reading_time} min
                              </>
                            )}
                            {content.video_duration && (
                              <>
                                <PlayCircleIcon className="w-3 h-3" />
                                {formatDuration(content.video_duration)}
                              </>
                            )}
                          </span>
                          <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>
    </FadeIn>
  );
}
