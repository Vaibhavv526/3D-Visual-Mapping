document.addEventListener('DOMContentLoaded', () => {
  // --- Pipeline Scroll Logic ---
  const track = document.getElementById('pipeline');
  const cards = document.querySelectorAll('.ps-card');
  const dots = document.querySelectorAll('.side-dot');
  const progressBar = document.getElementById('progress-bar');
  const scrollCue = document.getElementById('scroll-cue');
  
  const numSteps = cards.length;
  let currentStep = -1;

  function updatePipeline() {
    if (!track) return;
    
    const rect = track.getBoundingClientRect();
    const trackH = rect.height;
    const vh = window.innerHeight;
    
    // Distance scrolled past top of track
    const scrolled = -rect.top;
    
    // If not in view or before track
    if (scrolled < 0) {
      setStep(0);
      progressBar.style.opacity = '0';
      progressBar.style.width = '0%';
      dots[0].parentElement.style.opacity = '0';
      return;
    }
    
    // If past track
    if (scrolled > trackH - vh) {
      setStep(numSteps - 1);
      progressBar.style.opacity = '0';
      progressBar.style.width = '100%';
      dots[0].parentElement.style.opacity = '0';
      return;
    }

    // Inside track
    progressBar.style.opacity = '1';
    dots[0].parentElement.style.opacity = '1';
    
    const progress = scrolled / (trackH - vh);
    progressBar.style.width = `${progress * 100}%`;
    
    let stepIndex = Math.floor(progress * numSteps);
    // clamp just in case
    if (stepIndex >= numSteps) stepIndex = numSteps - 1;
    if (stepIndex < 0) stepIndex = 0;
    
    setStep(stepIndex);
  }

  function setStep(index) {
    if (currentStep === index) return;
    
    if (index === 0 && scrollCue) {
      scrollCue.style.opacity = '1';
    } else if (scrollCue) {
      scrollCue.style.opacity = '0';
    }

    cards.forEach((card, i) => {
      if (i === index) {
        card.classList.add('active');
        card.classList.remove('leaving');
      } else if (i < index) {
        card.classList.remove('active');
        card.classList.add('leaving');
      } else {
        card.classList.remove('active');
        card.classList.remove('leaving');
      }
    });

    dots.forEach((dot, i) => {
      if (i === index) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    currentStep = index;
  }

  // Initial call and scroll listener
  updatePipeline();
  window.addEventListener('scroll', updatePipeline, { passive: true });
  window.addEventListener('resize', updatePipeline, { passive: true });

  // Dot clicking
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const targetStep = parseInt(dot.getAttribute('data-step'), 10);
      const rect = track.getBoundingClientRect();
      const scrolled = -rect.top + window.scrollY; // track absolute top
      const trackH = track.offsetHeight;
      const vh = window.innerHeight;
      
      const targetScroll = scrolled + ((targetStep + 0.5) / numSteps) * (trackH - vh);
      window.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
    });
  });
});
