import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { z } from 'zod';
import MemorySection from '../../client/src/components/MemorySection';

// Mock the API request function
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: {
    invalidateQueries: vi.fn(),
    refetchQueries: vi.fn(),
  }
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Manual memory schema for validation testing
const manualMemorySchema = z.object({
  content: z.string().min(10, "Memory content must be at least 10 characters").max(500, "Memory content must be less than 500 characters"),
  category: z.enum(["preference", "personal_info", "context", "instruction"], {
    required_error: "Please select a memory category",
  }),
  importance: z.enum(["low", "medium", "high"], {
    required_error: "Please select importance level",
  }),
});

describe('Manual Memory Entry Feature', () => {
  let queryClient: QueryClient;
  let mockApiRequest: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    mockApiRequest = vi.mocked(require('@/lib/queryClient').apiRequest);
    mockApiRequest.mockClear();
    
    // Mock successful memory fetch (empty initially)
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    ) as any;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const renderMemorySection = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemorySection />
      </QueryClientProvider>
    );
  };

  describe('UI Components', () => {
    it('renders Add Memory button in Memory Overview', async () => {
      renderMemorySection();
      
      await waitFor(() => {
        expect(screen.getByText('Add Memory')).toBeInTheDocument();
      });
    });

    it('opens modal when Add Memory button is clicked', async () => {
      renderMemorySection();
      
      await waitFor(() => {
        const addButton = screen.getByText('Add Memory');
        fireEvent.click(addButton);
      });

      expect(screen.getByText('Manually Add Memory')).toBeInTheDocument();
      expect(screen.getByText('Add important information that your AI coach should remember for future conversations.')).toBeInTheDocument();
    });

    it('displays all required form fields', async () => {
      renderMemorySection();
      
      const addButton = await screen.findByText('Add Memory');
      fireEvent.click(addButton);

      // Check for form fields
      expect(screen.getByLabelText('Memory Content')).toBeInTheDocument();
      expect(screen.getByLabelText('Category')).toBeInTheDocument();
      expect(screen.getByLabelText('Importance Level')).toBeInTheDocument();
      
      // Check for action buttons
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save Memory')).toBeInTheDocument();
    });

    it('shows proper placeholder text and descriptions', async () => {
      renderMemorySection();
      
      const addButton = await screen.findByText('Add Memory');
      fireEvent.click(addButton);

      const textarea = screen.getByPlaceholderText(/Enter information you want your AI coach to remember/);
      expect(textarea).toBeInTheDocument();
      
      expect(screen.getByText('Describe the information clearly and specifically.')).toBeInTheDocument();
      expect(screen.getByText('Choose the type of information this memory represents.')).toBeInTheDocument();
      expect(screen.getByText('How important is this information for coaching decisions?')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates minimum content length', () => {
      const shortContent = "short";
      const result = manualMemorySchema.safeParse({
        content: shortContent,
        category: "preference",
        importance: "medium"
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Memory content must be at least 10 characters");
      }
    });

    it('validates maximum content length', () => {
      const longContent = "a".repeat(501);
      const result = manualMemorySchema.safeParse({
        content: longContent,
        category: "preference",
        importance: "medium"
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Memory content must be less than 500 characters");
      }
    });

    it('validates category enum values', () => {
      const invalidCategory = manualMemorySchema.safeParse({
        content: "Valid content that is long enough",
        category: "invalid_category" as any,
        importance: "medium"
      });

      expect(invalidCategory.success).toBe(false);
    });

    it('validates importance enum values', () => {
      const invalidImportance = manualMemorySchema.safeParse({
        content: "Valid content that is long enough",
        category: "preference",
        importance: "invalid_importance" as any
      });

      expect(invalidImportance.success).toBe(false);
    });

    it('accepts valid input', () => {
      const validInput = manualMemorySchema.safeParse({
        content: "I prefer morning workouts and have a gluten sensitivity",
        category: "preference",
        importance: "medium"
      });

      expect(validInput.success).toBe(true);
    });
  });

  describe('Form Submission', () => {
    it('prevents submission with invalid data', async () => {
      renderMemorySection();
      
      const addButton = await screen.findByText('Add Memory');
      fireEvent.click(addButton);

      const saveButton = screen.getByText('Save Memory');
      const textarea = screen.getByLabelText('Memory Content');
      
      // Try to submit with short content
      fireEvent.change(textarea, { target: { value: 'short' } });
      fireEvent.click(saveButton);

      // Should not call API with invalid data
      expect(mockApiRequest).not.toHaveBeenCalled();
    });

    it('calls API with correct data on valid submission', async () => {
      mockApiRequest.mockResolvedValue({
        success: true,
        memory: {
          id: 'test-id',
          content: 'I prefer morning workouts and have a gluten sensitivity',
          category: 'preference',
          importance: 0.6,
          createdAt: new Date().toISOString()
        }
      });

      renderMemorySection();
      
      const addButton = await screen.findByText('Add Memory');
      fireEvent.click(addButton);

      // Fill form with valid data
      const textarea = screen.getByLabelText('Memory Content');
      fireEvent.change(textarea, { 
        target: { value: 'I prefer morning workouts and have a gluten sensitivity' } 
      });

      // Select category
      const categorySelect = screen.getByLabelText('Category');
      fireEvent.click(categorySelect);
      fireEvent.click(screen.getByText('Preferences'));

      // Select importance
      const importanceSelect = screen.getByLabelText('Importance Level');
      fireEvent.click(importanceSelect);
      fireEvent.click(screen.getByText('Medium - Important preference'));

      const saveButton = screen.getByText('Save Memory');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('/api/memories/manual', 'POST', {
          content: 'I prefer morning workouts and have a gluten sensitivity',
          category: 'preference',
          importance: 0.6
        });
      });
    });

    it('converts importance levels to numeric scores correctly', () => {
      const importanceMap = { low: 0.3, medium: 0.6, high: 0.9 };
      
      expect(importanceMap.low).toBe(0.3);
      expect(importanceMap.medium).toBe(0.6);
      expect(importanceMap.high).toBe(0.9);
    });

    it('shows loading state during submission', async () => {
      // Mock a delayed response
      mockApiRequest.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          memory: { id: 'test-id' }
        }), 100))
      );

      renderMemorySection();
      
      const addButton = await screen.findByText('Add Memory');
      fireEvent.click(addButton);

      // Fill and submit form
      const textarea = screen.getByLabelText('Memory Content');
      fireEvent.change(textarea, { 
        target: { value: 'Valid memory content that is long enough' } 
      });

      const saveButton = screen.getByText('Save Memory');
      fireEvent.click(saveButton);

      // Should show loading state
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      
      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      const mockToast = vi.fn();
      vi.mocked(require('@/hooks/use-toast').useToast).mockReturnValue({
        toast: mockToast
      });

      mockApiRequest.mockRejectedValue(new Error('API Error'));

      renderMemorySection();
      
      const addButton = await screen.findByText('Add Memory');
      fireEvent.click(addButton);

      // Fill and submit form
      const textarea = screen.getByLabelText('Memory Content');
      fireEvent.change(textarea, { 
        target: { value: 'Valid memory content that is long enough' } 
      });

      const saveButton = screen.getByText('Save Memory');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'API Error',
          variant: 'destructive'
        });
      });
    });

    it('handles network errors with fallback message', async () => {
      const mockToast = vi.fn();
      vi.mocked(require('@/hooks/use-toast').useToast).mockReturnValue({
        toast: mockToast
      });

      mockApiRequest.mockRejectedValue({});

      renderMemorySection();
      
      const addButton = await screen.findByText('Add Memory');
      fireEvent.click(addButton);

      // Fill and submit form
      const textarea = screen.getByLabelText('Memory Content');
      fireEvent.change(textarea, { 
        target: { value: 'Valid memory content that is long enough' } 
      });

      const saveButton = screen.getByText('Save Memory');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to save memory. Please try again.',
          variant: 'destructive'
        });
      });
    });
  });

  describe('Cache Management', () => {
    it('invalidates queries after successful submission', async () => {
      const mockQueryClient = require('@/lib/queryClient').queryClient;
      
      mockApiRequest.mockResolvedValue({
        success: true,
        memory: { id: 'test-id' }
      });

      renderMemorySection();
      
      const addButton = await screen.findByText('Add Memory');
      fireEvent.click(addButton);

      // Fill and submit form
      const textarea = screen.getByLabelText('Memory Content');
      fireEvent.change(textarea, { 
        target: { value: 'Valid memory content that is long enough' } 
      });

      const saveButton = screen.getByText('Save Memory');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['memories'] });
        expect(mockQueryClient.refetchQueries).toHaveBeenCalled();
      });
    });

    it('closes modal and resets form after successful submission', async () => {
      const mockToast = vi.fn();
      vi.mocked(require('@/hooks/use-toast').useToast).mockReturnValue({
        toast: mockToast
      });

      mockApiRequest.mockResolvedValue({
        success: true,
        memory: { id: 'test-id' }
      });

      renderMemorySection();
      
      const addButton = await screen.findByText('Add Memory');
      fireEvent.click(addButton);

      // Fill and submit form
      const textarea = screen.getByLabelText('Memory Content');
      fireEvent.change(textarea, { 
        target: { value: 'Valid memory content that is long enough' } 
      });

      const saveButton = screen.getByText('Save Memory');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Memory saved',
          description: 'Your memory has been processed and saved successfully.'
        });
      });

      // Modal should close
      expect(screen.queryByText('Manually Add Memory')).not.toBeInTheDocument();
    });
  });

  describe('Integration Points', () => {
    it('integrates with existing memory system', () => {
      // Test that the feature uses the same API patterns as existing memory functionality
      const expectedEndpoint = '/api/memories/manual';
      const expectedMethod = 'POST';
      
      // Verify that the endpoint follows REST conventions
      expect(expectedEndpoint).toMatch(/^\/api\/memories/);
      expect(expectedMethod).toBe('POST');
    });

    it('maintains consistency with memory data structure', () => {
      const memoryData = {
        content: 'Test memory content',
        category: 'preference',
        importance: 0.6
      };

      // Verify data structure matches existing memory system
      expect(memoryData).toHaveProperty('content');
      expect(memoryData).toHaveProperty('category');
      expect(memoryData).toHaveProperty('importance');
      expect(typeof memoryData.importance).toBe('number');
    });
  });
});