import logoUrl, { ReactComponent as Logo } from './sea.svg';

console.log('logoUrl:::', logoUrl);
console.log('LogoComponent:::', Logo);

document.getElementById('url').innerText = logoUrl;
document.getElementById('comp').innerText = Logo;