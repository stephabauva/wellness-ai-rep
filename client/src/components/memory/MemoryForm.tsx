import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@shared/components/ui/collapsible";
import { Textarea } from "@shared/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@shared/components/ui/form";
import { Trash2, Brain, User, Settings, Lightbulb, Apple, Target, ChevronDown, ChevronUp, Info, X, Plus, Calendar, AlertCircle, Eye, Loader2, CheckCircle, Mic, MicOff, Volume2, History, Zap, Clock, HelpCircle, Edit3, MousePointer2, CheckSquare } from "lucide-react";
import { useToast } from "@shared/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@shared/components/ui/tooltip";
import { 
  manualMemorySchema, 
  ManualMemoryFormData, 
  categoryIcons, 
  categoryLabels, 
  categoryColors, 
  explanationCards 
} from "./constants";
import { 
  SmartDefault, 
  PresetButton, 
  healthPresets, 
  getTimeContext, 
  getSmartDefaults, 
  saveSmartDefault, 
  getRecentValues, 
  getContextualPresets 
} from "./utils";

interface MemoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ManualMemoryFormData) => void;
  isSubmitting: boolean;
  voiceInput?: {
    isSupported: boolean;
    isListening: boolean;
    isActive: boolean;
    transcript: string;
    interimTranscript: string;
    error: string | null;
    onToggle: () => void;
  };
}

export function MemoryForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isSubmitting,
  voiceInput 
}: MemoryFormProps) {
  const { toast } = useToast();
  const [showSmartDefaults, setShowSmartDefaults] = useState<boolean>(false);
  const [showPresets, setShowPresets] = useState<boolean>(false);
  
  // Form for manual memory entry with smart defaults
  const form = useForm<ManualMemoryFormData>({
    resolver: zodResolver(manualMemorySchema),
    defaultValues: {
      content: "",
      category: "preferences",
      importance: "medium",
    },
  });

  // Smart defaults state
  const [smartDefaults, setSmartDefaults] = useState<SmartDefault[]>([]);
  const [recentContent, setRecentContent] = useState<string[]>([]);
  const [contextualPresets, setContextualPresets] = useState<PresetButton[]>([]);

  // Load smart defaults on component mount
  useEffect(() => {
    setSmartDefaults(getSmartDefaults());
    setRecentContent(getRecentValues('content'));
    setContextualPresets(getContextualPresets());
  }, []);

  // Auto-populate form with smart defaults when opening
  useEffect(() => {
    if (isOpen && smartDefaults.length > 0) {
      const mostRecent = smartDefaults[0];
      const timeContext = getTimeContext();
      
      // Set category based on time context or most recent
      if (timeContext === 'morning' && smartDefaults.find(d => d.category === 'preferences')) {
        form.setValue('category', 'preferences');
      } else if (timeContext === 'evening' && smartDefaults.find(d => d.category === 'goals')) {
        form.setValue('category', 'goals');
      } else {
        form.setValue('category', mostRecent.category as any);
      }
      
      // Set importance based on most common choice
      const importanceFrequency = smartDefaults.reduce((acc, d) => {
        acc[d.importance] = (acc[d.importance] || 0) + d.frequency;
        return acc;
      }, {} as Record<string, number>);
      const mostCommonImportance = Object.entries(importanceFrequency)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'medium';
      form.setValue('importance', mostCommonImportance as any);
    }
  }, [isOpen, smartDefaults, form]);

  // Handle preset selection
  const handlePresetSelect = (preset: PresetButton) => {
    form.setValue('content', preset.content);
    form.setValue('category', preset.category as any);
    form.setValue('importance', preset.importance as any);
    setShowPresets(false);
    toast({
      title: "Preset Applied",
      description: `${preset.label} template loaded. Continue editing as needed.`,
    });
  };

  // Handle smart default selection
  const handleSmartDefaultSelect = (defaultValue: SmartDefault) => {
    form.setValue('content', defaultValue.content);
    form.setValue('category', defaultValue.category as any);
    form.setValue('importance', defaultValue.importance as any);
    setShowSmartDefaults(false);
    toast({
      title: "Previous Entry Loaded",
      description: "Similar content from your history applied.",
    });
  };

  // Handle recent content selection
  const handleRecentContentSelect = (content: string) => {
    form.setValue('content', content);
    toast({
      title: "Recent Content Applied",
      description: "Previous content loaded for quick editing.",
    });
  };

  const handleFormSubmit = (data: ManualMemoryFormData) => {
    onSubmit(data);
    form.reset();
    onClose();
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onClose}>
      <CollapsibleContent>
        <div className="border rounded-lg p-4 mb-6 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Add New Memory</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Add important information that your AI coach should remember for future conversations.
            <span className="block text-xs text-gray-500 mt-1">
              🔒 Your data is encrypted and stored securely with full privacy protection
            </span>
          </p>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              {/* Quick Access Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPresets(!showPresets)}
                  className="min-h-[44px] px-4 flex items-center gap-2 justify-start"
                >
                  <Zap className="h-4 w-4" />
                  <span className="text-sm">Quick Templates</span>
                  {contextualPresets.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {contextualPresets.length}
                    </Badge>
                  )}
                </Button>
                
                {smartDefaults.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSmartDefaults(!showSmartDefaults)}
                    className="min-h-[44px] px-4 flex items-center gap-2 justify-start"
                  >
                    <History className="h-4 w-4" />
                    <span className="text-sm">Recent Entries</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {smartDefaults.length}
                    </Badge>
                  </Button>
                )}
                
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px] px-4 flex items-center gap-2 justify-start text-purple-600"
                  disabled
                >
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">{getTimeContext().charAt(0).toUpperCase() + getTimeContext().slice(1)}</span>
                </Button>
              </div>

              {/* Preset Templates */}
              <Collapsible open={showPresets} onOpenChange={setShowPresets}>
                <CollapsibleContent>
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-medium text-blue-800 mb-3">Quick Templates</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {contextualPresets.map((preset) => (
                        <Button
                          key={preset.id}
                          type="button"
                          variant="ghost"
                          onClick={() => handlePresetSelect(preset)}
                          className="min-h-[44px] p-3 text-left justify-start hover:bg-blue-100"
                        >
                          <span className="mr-2 text-lg">{preset.icon}</span>
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-medium">{preset.label}</span>
                            <span className="text-xs text-gray-600 truncate">{preset.content}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Smart Defaults */}
              <Collapsible open={showSmartDefaults} onOpenChange={setShowSmartDefaults}>
                <CollapsibleContent>
                  <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="text-sm font-medium text-green-800 mb-3">Your Recent Entries</h4>
                    <div className="space-y-2">
                      {smartDefaults.slice(0, 5).map((defaultValue, index) => (
                        <Button
                          key={index}
                          type="button"
                          variant="ghost"
                          onClick={() => handleSmartDefaultSelect(defaultValue)}
                          className="w-full min-h-[44px] p-3 text-left justify-start hover:bg-green-100"
                        >
                          <div className="flex items-center gap-2">
                            {categoryIcons[defaultValue.category as keyof typeof categoryIcons]}
                            <div className="flex flex-col items-start">
                              <span className="text-sm font-medium truncate max-w-[200px]">{defaultValue.content}</span>
                              <span className="text-xs text-gray-600">
                                {categoryLabels[defaultValue.category as keyof typeof categoryLabels]} • Used {defaultValue.frequency} times
                              </span>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
              
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Content
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">
                            Be specific and clear. Include context that helps your AI coach provide better recommendations. Examples: "I prefer low-sodium meals", "My goal is to walk 10,000 steps daily", "I have a nut allergy".
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      {voiceInput?.isSupported && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={voiceInput.onToggle}
                          className={`ml-auto min-h-[32px] min-w-[32px] p-1 ${
                            voiceInput.isListening ? 'bg-red-50 border-red-200 text-red-600' : 'hover:bg-gray-50'
                          }`}
                        >
                          {voiceInput.isListening ? (
                            <MicOff className="h-3 w-3" />
                          ) : (
                            <Mic className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Enter important information for your AI coach to remember..."
                          className="min-h-[100px] text-gray-800"
                          {...field}
                        />
                        {voiceInput?.isListening && voiceInput.interimTranscript && (
                          <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                            <strong>Listening:</strong> {voiceInput.interimTranscript}
                          </div>
                        )}
                        {voiceInput?.error && (
                          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                            Voice input error: {voiceInput.error}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Be specific and clear. This helps your AI coach provide more personalized guidance.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Category
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">
                              Choose the category that best describes this information. This helps your AI coach understand the context and provide relevant guidance.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {Object.entries(categoryLabels).map(([key, label]) => (
                            <Tooltip key={key}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => field.onChange(key)}
                                  className={`
                                    min-h-[72px] p-3 rounded-lg border-2 transition-all
                                    flex flex-col items-center justify-center gap-2
                                    touch-manipulation focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                                    ${field.value === key
                                      ? categoryColors[key as keyof typeof categoryColors].includes('purple')
                                        ? 'bg-purple-100 text-purple-800 border-purple-300 ring-2 ring-purple-300'
                                        : categoryColors[key as keyof typeof categoryColors].includes('blue')
                                        ? 'bg-blue-100 text-blue-800 border-blue-300 ring-2 ring-blue-300'
                                        : categoryColors[key as keyof typeof categoryColors].includes('green')
                                        ? 'bg-green-100 text-green-800 border-green-300 ring-2 ring-green-300'
                                        : categoryColors[key as keyof typeof categoryColors].includes('yellow')
                                        ? 'bg-yellow-100 text-yellow-800 border-yellow-300 ring-2 ring-yellow-300'
                                        : categoryColors[key as keyof typeof categoryColors].includes('pink')
                                        ? 'bg-pink-100 text-pink-800 border-pink-300 ring-2 ring-pink-300'
                                        : categoryColors[key as keyof typeof categoryColors].includes('red')
                                        ? 'bg-red-100 text-red-800 border-red-300 ring-2 ring-red-300'
                                        : 'bg-gray-100 text-gray-800 border-gray-300 ring-2 ring-gray-300'
                                      : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                                    }
                                  `}
                                >
                                  <div className={`p-1 rounded-full ${field.value === key ? 'text-current' : 'text-gray-600'}`}>
                                    {categoryIcons[key as keyof typeof categoryIcons]}
                                  </div>
                                  <span className={`text-xs font-medium text-center leading-tight ${field.value === key ? 'text-current' : 'text-gray-700'}`}>
                                    {label}
                                  </span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">
                                    {explanationCards[key as keyof typeof explanationCards]?.description}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {explanationCards[key as keyof typeof explanationCards]?.coachingBenefits}
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Choose the type of information this memory represents.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="importance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Importance Level
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">
                              Higher importance memories are prioritized when your AI coach makes recommendations. Critical health information should be marked as high importance.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { value: 'low', label: 'Low', description: 'General information', color: 'bg-gray-100 text-gray-800', icon: '📝' },
                            { value: 'medium', label: 'Medium', description: 'Important preference', color: 'bg-orange-100 text-orange-800', icon: '⚡' },
                            { value: 'high', label: 'High', description: 'Critical health information', color: 'bg-red-100 text-red-800', icon: '🚨' }
                          ].map((importance) => (
                            <button
                              key={importance.value}
                              type="button"
                              onClick={() => field.onChange(importance.value)}
                              className={`
                                min-h-[56px] p-3 rounded-lg border-2 transition-all
                                flex items-center justify-start gap-3
                                touch-manipulation focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                                ${field.value === importance.value
                                  ? `${importance.color} border-current ring-2 ring-offset-2 ring-current`
                                  : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                                }
                              `}
                            >
                              <span className="text-lg">{importance.icon}</span>
                              <div className="flex flex-col items-start">
                                <span className={`text-sm font-medium ${field.value === importance.value ? 'text-current' : 'text-gray-900'}`}>
                                  {importance.label}
                                </span>
                                <span className={`text-xs ${field.value === importance.value ? 'text-current opacity-90' : 'text-gray-600'}`}>
                                  {importance.description}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </FormControl>
                      <FormDescription>
                        How important is this information for coaching decisions?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="min-h-[44px] px-6"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 min-h-[44px] px-6"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Save Memory"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}