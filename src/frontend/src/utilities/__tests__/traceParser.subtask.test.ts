import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addSubTask, Task } from '../traceParser';

describe('traceParser subtask functions', () => {
  describe('addSubTask', () => {
    it('should initialize subtasks array if not exists', () => {
      // Create parent task without subtasks
      const parentTask: Task = {
        stepNumber: 1,
        title: 'Parent Task',
        content: 'Main content',
        timestamp: 1000
      };
      
      const currentTime = 1500;
      
      // Add a subtask
      addSubTask(
        parentTask,
        'Test Subtask',
        'Subtask content',
        null,
        currentTime
      );
      
      // Verify subtasks array was created
      expect(parentTask.subTasks).toBeDefined();
      expect(parentTask.subTasks?.length).toBe(1);
      expect(parentTask.subTasks?.[0].title).toContain('Step 1.1');
      expect(parentTask.subTasks?.[0].title).toContain('Test Subtask');
    });
    
    it('should add subtask with correct step numbering', () => {
      // Create parent task with existing subtasks
      const parentTask: Task = {
        stepNumber: 2,
        title: 'Parent Task',
        content: 'Main content',
        timestamp: 1000,
        subTasks: [
          {
            title: 'Step 2.1 - Existing Subtask (0.50 seconds)',
            content: 'Existing content',
            fullJson: null,
            timestamp: 1200
          }
        ]
      };
      
      const currentTime = 1500;
      
      // Add another subtask
      addSubTask(
        parentTask,
        'New Subtask',
        'New content',
        null,
        currentTime
      );
      
      // Verify correct numbering
      expect(parentTask.subTasks?.length).toBe(2);
      expect(parentTask.subTasks?.[1].title).toContain('Step 2.2');
      expect(parentTask.subTasks?.[1].title).toContain('New Subtask');
    });
    
    it('should update existing subtask with similar title', () => {
      // Create parent task with existing subtask
      const parentTask: Task = {
        stepNumber: 3,
        title: 'Parent Task',
        content: 'Main content',
        timestamp: 1000,
        subTasks: [
          {
            title: 'Step 3.1 - Knowledge Base Input (0.50 seconds)',
            content: 'Old content',
            fullJson: null,
            timestamp: 1200
          }
        ]
      };
      
      const currentTime = 1500;
      
      // Add subtask with similar title (should update instead of adding new)
      addSubTask(
        parentTask,
        'Knowledge Base Input',
        'Updated content',
        'json content',
        currentTime
      );
      
      // Verify update instead of new addition
      expect(parentTask.subTasks?.length).toBe(1);
      expect(parentTask.subTasks?.[0].title).toContain('Step 3.1');
      expect(parentTask.subTasks?.[0].content).toBe('Updated content');
    });
    
    it('should sort subtasks by step number', () => {
      // Create parent task
      const parentTask: Task = {
        stepNumber: 4,
        title: 'Parent Task',
        content: 'Main content',
        timestamp: 1000,
        subTasks: []
      };
      
      // Add subtasks in reverse order to test sorting
      addSubTask(parentTask, 'Third Subtask', 'third content', null, 1600);
      addSubTask(parentTask, 'First Subtask', 'first content', null, 1200);
      addSubTask(parentTask, 'Second Subtask', 'second content', null, 1400);
      
      // Manually set the titles to simulate out of order step numbers
      if (parentTask.subTasks) {
        parentTask.subTasks[0].title = 'Step 4.3 - Third Subtask (0.60 seconds)';
        parentTask.subTasks[1].title = 'Step 4.1 - First Subtask (0.20 seconds)';
        parentTask.subTasks[2].title = 'Step 4.2 - Second Subtask (0.40 seconds)';
      }
      
      // Add one more subtask to trigger sorting
      addSubTask(parentTask, 'Fourth Subtask', 'fourth content', null, 1800);
      
      // Verify sorting was done correctly
      expect(parentTask.subTasks?.length).toBe(4);
      expect(parentTask.subTasks?.[0].title).toContain('Step 4.1');
      expect(parentTask.subTasks?.[1].title).toContain('Step 4.2');
      expect(parentTask.subTasks?.[2].title).toContain('Step 4.3');
      expect(parentTask.subTasks?.[3].title).toContain('Step 4.4');
    });
    
    it('should calculate elapsed time from parent task timestamp', () => {
      const parentTask: Task = {
        stepNumber: 5,
        title: 'Parent Task',
        content: 'Main content',
        timestamp: 10000
      };
      
      const currentTime = 12500; // 2.5 seconds later
      
      addSubTask(
        parentTask,
        'Time Test Subtask',
        'Content',
        null,
        currentTime
      );
      
      expect(parentTask.subTasks?.[0].title).toContain('(2.50 seconds)');
    });
  });
});
